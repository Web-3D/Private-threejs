# BaseShaderMaterial

Abstract base class cho mọi TSL NodeMaterial shader. Cung cấp `dispose()`, `getMaterial()`, và `isDisposed` guard — loại bỏ ~15 dòng boilerplate từ mỗi shader class.

## Vấn đề giải quyết

Mỗi shader trong threejs-modules phải tự viết lại cùng pattern:

```typescript
// Pattern lặp lại trong DissolveShader, TriplanarMapping, WindAnimation...
private material: NodeMaterial | null = null
private isDisposed = false

getMaterial(): NodeMaterial {
  if (!this.material) throw new Error('MyShader: already disposed')
  return this.material
}

dispose(): void {
  if (this.isDisposed) return
  this.material?.dispose()
  this.material = null
  this.isDisposed = true
}
```

Sau khi extend `BaseShaderMaterial`, chỉ cần viết logic shader thực sự.

## Cách extend

```typescript
import { NodeMaterial } from 'three/webgpu'
import { color, mix, uniform } from 'three/tsl'
import { BaseShaderMaterial } from 'threejs-modules/shaders/foundation/BaseShaderMaterial'

class MyShader extends BaseShaderMaterial {
  private readonly uIntensity = uniform(1.0)  // field initializer, chạy sau super()

  constructor(baseColor: THREE.ColorRepresentation) {
    super()
    // uIntensity đã sẵn sàng sau super() trả về
    const mat = new NodeMaterial()
    mat.colorNode = color(baseColor).mul(this.uIntensity)
    this.material = mat  // gán vào protected field của base
  }

  setIntensity(v: number): void {
    if (this.isDisposed) return  // protected isDisposed từ base
    this.uIntensity.value = Math.max(0, v)
  }
}

const shader = new MyShader(0xff8800)
mesh.material = shader.getMaterial()  // từ base
shader.setIntensity(2.0)
shader.dispose()                      // từ base
```

## API

| Method / Field | Scope | Mô tả |
|---|---|---|
| `protected material` | subclass | NodeMaterial — gán trong constructor sau super() |
| `protected isDisposed` | subclass | Guard — check trước mọi lời gọi |
| `getMaterial()` | public | Trả material, throw nếu disposed |
| `dispose()` | public | Dispose material, set isDisposed = true |

## Quy tắc quan trọng

### Constructor ordering — tại sao không dùng abstract build() trong base constructor

JavaScript chạy parent constructor TRƯỚC subclass field initializers:

```
new MyShader()
  → super() chạy (base constructor)
    → class field initializers của MyShader chạy (uIntensity = uniform(0))
  → phần còn lại của MyShader constructor chạy
```

Nếu base constructor gọi `this.build()`, `this.uIntensity` chưa tồn tại lúc đó → shader compile lỗi.  
Pattern đúng: subclass tự gán `this.material = mat` trong constructor body sau `super()`.

### Texture ownership

Class không dispose texture do caller truyền vào. Nếu shader nhận `opts.map: THREE.Texture`, caller phải tự dispose texture khi xong.

## Lưu ý

- `getMaterial()` throw kèm tên class cụ thể (`DissolveShader: already disposed`) — dễ debug hơn generic message
- `isDisposed` là `protected` — subclass đọc trực tiếp, không cần getter
- Không cần gọi `super.dispose()` thêm lần nào — chỉ gọi `this.dispose()` từ ngoài
