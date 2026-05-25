# future-effects — FireSystem · FluidSystem · TrailSystem

> Mở rộng `threejs-modules/effects/` — xây trên GPUParticleSystem pattern.
> Revisit khi: có scene cụ thể cần effect này, hoặc khi có thời gian R&D WebGPU compute.

---

## FireSystem

**Mục đích:** Hệ thống lửa GPU-driven — campfire, torch, explosion fire, flame thrower.

**Category:** `effects/` | **Complexity:** medium | **Pattern:** Preset trên GPUParticleSystem

### Tại sao chưa build ngay
`GPUParticleSystem` đã cung cấp đủ khả năng build fire thủ công — xem "Fire Embers" example trong `GPUParticleSystem/README.md`.  
`FireSystem` sẽ là preset với defaults chuẩn và multiple emitter layers — không cần thiết cho đến khi có scene thực tế.

### Architecture dự kiến

```
FireSystem
├── innerFlame  — GPUParticleSystem (cone, count: 200, lifetime: 0.6)
├── outerFlame  — GPUParticleSystem (cone wider, count: 150, lifetime: 1.0)
└── smoke       — GPUParticleSystem (disc, count: 80, lifetime: 3.0, lazy start)
```

3 layer riêng biệt vì physics khác nhau (smoke = chậm, nhẹ, drift ngang; flame = nhanh, thẳng đứng).

### Builder functions cho outer flame
```typescript
buildPosition: ({ aDir, tScaled, uTime }) => {
  const rise   = vec3(0, float(1.2), 0).mul(tScaled)
  const spread = aDir.mul(float(0.4)).mul(tScaled)
  const noise  = triNoise3D(rise.mul(float(1.5)), float(0.6), uTime)
  return rise.add(spread).add(vec3(1, 0, 1).mul(noise.sub(float(0.5))).mul(float(0.3)))
},
buildColor: ({ t }) =>
  mix(color(0xffffff), mix(color(0xff8800), color(0xff1100), t.sub(float(0.3)).max(float(0))), t),
buildOpacity: ({ bell, t }) => bell.mul(float(0.85)).mul(float(1).sub(t.mul(float(0.5)))),
```

### API cần có
```typescript
class FireSystem {
  setIntensity(value: number): void  // scale count + spread
  setWind(x: number, z: number): void
  update(time: number): void
  dispose(): void
}
```

---

## FluidSystem

**Mục đích:** Fluid dynamics — nước, chất lỏng, smoke volume, lava flow.

**Category:** `effects/` | **Complexity:** high | **Requires:** WebGPU compute

### Tại sao chưa build ngay
- Cần WebGPU compute shaders — không fallback về WebGL
- R&D nặng: chọn đúng algorithm cho use case (particle spray vs. grid sim vs. SPH)
- Scope quá lớn cho giai đoạn hiện tại

### Ba approach — chọn tùy scene

| Approach | Khi nào | GPU Cost | Complexity |
|---|---|---|---|
| **Particle spray** | Waterfall, splash, rain spray | thấp | low |
| **SPH** (Smoothed Particle Hydrodynamics) | Nước có va chạm vật lý | rất cao | very high |
| **Eulerian grid** | Smoke, fog volume | cao | high |
| **Visual fake** | Lava flow = displacement + scroll | thấp | low |

### Hướng khả thi nhất với Three.js 0.174

**Visual fake lava/water:**
```typescript
// Displacement scroll = lava effect không cần physics
const uFlowDir = uniform(new THREE.Vector2(0.1, 0.05))
const scrolledUV = uv().add(uFlowDir.mul(uTime))
const displacement = texture(heightMap, scrolledUV).r
material.positionNode = positionLocal.add(normalLocal.mul(displacement).mul(uScale))
```

**WebGPU compute SPH** — khi ready:
- Viết compute shader với `wgsl` hoặc TSL compute nodes
- Ping-pong buffer: đọc position frame trước, ghi position frame sau
- Three.js 0.174 có `WebGPURenderer.computeAsync()` — verify trước khi dùng

### Revisit khi
- Scene cần water/liquid (không fake được)
- WebGPU adoption > 70% browser
- Có ít nhất 1 ngày R&D riêng

---

## TrailSystem

**Mục đích:** Ribbon trail sau moving object — sword swing, vehicle trail, magic path, projectile.

**Category:** `effects/` | **Complexity:** medium | **Pattern:** Standalone (không dùng GPUParticleSystem)

### Tại sao khác GPUParticleSystem
GPUParticleSystem phù hợp cho emitter đứng yên phát ra hàng trăm particles độc lập.  
Trail cần **lịch sử vị trí** của 1 object → ribbon geometry nối tiếp → structure hoàn toàn khác.

### Architecture

```
TrailSystem
├── positions[]  — ring buffer (Float32Array) lưu N frame positions
├── geometry     — BufferGeometry với position + uv + index dynamic
└── material     — NodeMaterial với opacity fade từ head → tail
```

### Core algorithm (CPU-side)

```typescript
class TrailSystem {
  private ring: Float32Array   // [x,y,z] * maxLength
  private head = 0

  update(objectPosition: THREE.Vector3, width: number) {
    // Push new position vào ring buffer
    this.ring.set([objectPosition.x, objectPosition.y, objectPosition.z], this.head * 3)
    this.head = (this.head + 1) % this.maxLength

    // Rebuild ribbon: mỗi position → 2 vertices (trái/phải dọc tangent)
    // UV.x = 0..1 dọc trail length → dùng cho fade opacity
    this.rebuildGeometry(width)
    this.geometry.attributes.position.needsUpdate = true
  }
}
```

### Fade material
```typescript
// uv.x = 0 ở đầu trail (cũ), 1 ở cuối (mới)
material.opacityNode = uv().x.pow(float(0.5))  // fade toward tail
material.colorNode   = mix(tailColor, headColor, uv().x)
```

### Props cần có
```typescript
interface TrailOptions {
  maxLength:   number      // số frame giữ lại (default: 30)
  width:       number      // world-space ribbon width (default: 0.1)
  headColor:   ColorRepresentation  // màu đầu trail (mới)
  tailColor:   ColorRepresentation  // màu đuôi trail (cũ, thường transparent)
  fadeType:    'linear' | 'ease-out'
}
```

### Revisit khi
- Có sword combat, racing, hoặc projectile cần visual trail
- Sword swing = wide + short (0.3m, 15 frames) | Vehicle = narrow + long (0.05m, 60 frames)
