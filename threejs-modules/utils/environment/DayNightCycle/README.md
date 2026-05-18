# DayNightCycle

Chu kỳ ngày-đêm — drive `DirectionalLight` (mặt trời) và `AmbientLight` theo thời gian chuẩn hóa [0–1]. Sun arc, màu ánh sáng, và intensity tự động chuyển đổi từ đêm → bình minh → trưa → hoàng hôn → đêm.

## Khi nào dùng

| Dùng khi | Không dùng khi |
|----------|----------------|
| Outdoor scene cần thời gian thực | Indoor lighting cố định |
| Game world với skybox đổi màu | Cinematic lighting manual |
| Environment demo | Single static pose |

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `sunLight` | `THREE.DirectionalLight` | — | Đại diện mặt trời, **bắt buộc** |
| `ambientLight` | `THREE.AmbientLight` | — | Sky scatter, **bắt buộc** |
| `speed` | `number` | `0.05` | Tốc độ [cycles/giây] — 0.05 = 20s/chu kỳ |
| `startTime` | `number` | `0.25` | Thời điểm ban đầu [0–1] — 0.25 = bình minh |

## Thời điểm chuẩn hóa

| `normalizedTime` | Thời điểm | Sun elevation | Ánh sáng |
|------------------|-----------|---------------|----------|
| `0.0` | Nửa đêm | Dưới đường chân trời | Tối hoàn toàn |
| `0.25` | Bình minh | Vừa mọc | Cam/đỏ ấm |
| `0.5` | Giữa trưa | Đỉnh đầu | Trắng nhạt |
| `0.75` | Hoàng hôn | Vừa lặn | Cam/đỏ sậm |

## Usage

```ts
import * as THREE from 'three'
import { DayNightCycle } from 'threejs-modules/utils/DayNightCycle'

// 1. Tạo lights
const sunLight = new THREE.DirectionalLight(0xffffff, 0)
const ambientLight = new THREE.AmbientLight(0x050510, 0.2)
scene.add(sunLight, ambientLight)

// 2. Khởi tạo — bắt đầu từ bình minh
const dayNight = new DayNightCycle({
  sunLight,
  ambientLight,
  speed: 0.05,  // 20 giây mỗi chu kỳ
  startTime: 0.25,
})

// 3. Animation loop — dùng getDelta() !
const clock = new THREE.Clock()
renderer.setAnimationLoop(() => {
  dayNight.update(clock.getDelta())
  renderer.render(scene, camera)
})

// 4. Seek trực tiếp
dayNight.setNormalizedTime(0.5)  // nhảy đến giữa trưa

// 5. Cleanup (không dispose lights — caller sở hữu)
dayNight.dispose()
```

## Kết hợp GlobalUniforms

Nếu shader dùng `uTime` để tính toán lighting:

```ts
// Gọi GlobalUniforms.update() đồng bộ với DayNightCycle
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta()
  dayNight.update(dt)
  GlobalUniforms.getInstance().update(clock.getElapsedTime())
  renderer.render(scene, camera)
})
```

## Lỗi thường gặp

- ❌ **Dùng `clock.getElapsedTime()` thay vì `clock.getDelta()`** → DayNightCycle nhận elapsed seconds → chu kỳ chạy cực nhanh
- ❌ **Không add lights vào scene trước** → `scene.add(sunLight)` phải gọi trước khi render
- ❌ **Dispose light sau DayNightCycle** → DayNightCycle.dispose() không dispose lights — caller phải tự dispose sau
