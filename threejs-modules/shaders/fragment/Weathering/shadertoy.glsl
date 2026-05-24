// ─────────────────────────────────────────────────────────────────────────────
// Weathering — Shadertoy reference (paste tại shadertoy.com/new)
//
// Technique — 4 lớp blend tuần tự:
//   Layer 0 (base):  cleanCol — màu tường gốc (uniform)
//   Layer 1 (moss):  fbm(worldPos) → mask vùng ẩm thấp + north-facing → green tint
//   Layer 2 (dirt):  fbm(worldPos * 2) → streak chạy từ trên xuống + cạnh góc
//   Layer 3 (rust):  fbm(worldPos * 3) + metalMask → patches cam
//   Layer 4 (stain): rain streak — straight vertical smear from window edges
//
// Blend: từ 0 đến 1 theo mask riêng mỗi layer — có thể enable/disable từng layer
//
// Tune:
//   MOSS_AMT  = cường độ rêu (0–1)
//   DIRT_AMT  = cường độ bẩn (0–1)
//   RUST_AMT  = cường độ gỉ (0–1) — chỉ meaningful nếu surface có kim loại
//   STAIN_AMT = cường độ vệt nước (0–1)
//   COL_CLEAN = màu bề mặt sạch
// ─────────────────────────────────────────────────────────────────────────────

// ── Noise ─────────────────────────────────────────────────────────────────────

float hash21(vec2 p) {
    p = fract(p * vec2(0.1031, 0.1030));
    p += dot(p, p.yx + 33.33);
    return fract((p.x + p.y) * p.x);
}

float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1,0));
    float c = hash21(i + vec2(0,1)), d = hash21(i + vec2(1,1));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 3-octave fbm
float fbm(vec2 p) {
    return noise2(p)            * 0.57
         + noise2(p * 2.1+3.7) * 0.28
         + noise2(p * 4.7+1.3) * 0.14;
}

// ── Constants ──────────────────────────────────────────────────────────────────

#define MOSS_AMT  0.55
#define DIRT_AMT  0.45
#define RUST_AMT  0.30
#define STAIN_AMT 0.35

const vec3 COL_CLEAN = vec3(0.82, 0.77, 0.68);   // plaster / concrete
const vec3 COL_MOSS  = vec3(0.28, 0.45, 0.22);   // dark green moss
const vec3 COL_DIRT  = vec3(0.35, 0.28, 0.20);   // brown grime
const vec3 COL_RUST  = vec3(0.62, 0.30, 0.10);   // iron oxide
const vec3 COL_STAIN = vec3(0.60, 0.56, 0.50);   // rain streak (lighter dust smear)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y;

    // Treat UV as world-space XY at scale 1
    vec2 p = uv * 3.0;

    // ── Base ──────────────────────────────────────────────────────────────────
    vec3 col = COL_CLEAN;

    // ── Layer 1: Moss ─────────────────────────────────────────────────────────
    // Rêu tích tụ ở vùng thấp (p.y nhỏ) và vùng ẩm (fbm > threshold)
    float mossFbm  = fbm(p * 0.8 + vec2(1.1, 2.3));
    float mossLow  = smoothstep(0.7, 0.3, p.y);          // mạnh hơn ở thấp
    float mossMask = mossFbm * mossLow;
    mossMask = smoothstep(0.35, 0.65, mossMask) * MOSS_AMT;
    col = mix(col, COL_MOSS, mossMask);

    // ── Layer 2: Dirt streak ──────────────────────────────────────────────────
    // Bẩn chảy từ trên xuống — dùng UV.y đảo và fbm elongated theo Y
    vec2 dirtP  = vec2(p.x * 1.5, p.y * 0.3);  // stretch theo Y → streak shape
    float dirtN = fbm(dirtP + vec2(5.7, 0.0));
    float dirtMask = smoothstep(0.45, 0.65, dirtN) * DIRT_AMT;
    col = mix(col, COL_DIRT, dirtMask);

    // ── Layer 3: Rust patches ─────────────────────────────────────────────────
    float rustFbm  = fbm(p * 2.2 + vec2(8.1, 3.5));
    float rustMask = smoothstep(0.50, 0.72, rustFbm) * RUST_AMT;
    // Rust denser ở vùng thấp (nước đọng)
    rustMask *= (0.5 + 0.5 * smoothstep(0.8, 0.2, p.y));
    col = mix(col, COL_RUST, rustMask);

    // ── Layer 4: Rain stain streak ────────────────────────────────────────────
    // Vệt nước chạy thẳng đứng — noise chỉ theo X, uniform theo Y
    float stainNoise = noise2(vec2(p.x * 4.0, 0.0));
    float stainMask  = smoothstep(0.6, 0.75, stainNoise);
    // Fade ở bottom (rêu cover stain) và top
    stainMask *= smoothstep(0.0, 0.3, p.y) * smoothstep(1.2, 0.7, p.y);
    stainMask *= STAIN_AMT;
    col = mix(col, COL_STAIN, stainMask);

    fragColor = vec4(col, 1.0);
}
