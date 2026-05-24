// ─────────────────────────────────────────────────────────────────────────────
// WoodPlank — Shadertoy reference (paste tại shadertoy.com/new)
//
// Technique:
//   • Horizontal plank rows — UV repeat với seam gap ở biên
//   • Plank width variation — hash per row để width không đều
//   • Wood grain — directional noise dọc theo trục X, octave thứ hai cho vân phụ
//   • End-grain darkness — cạnh trái/phải mỗi plank tối hơn
//   • Knot — optional: circle SDF + radial grain wrap
//
// Tune:
//   PLANK_H   = chiều cao 1 tấm ván (0.2 = to, 0.08 = mỏng)
//   SEAM_H    = khe hở giữa các ván (0.01–0.03)
//   GRAIN_AMP = cường độ vân gỗ (0.15–0.35)
//   COL_WOOD  = màu gỗ sáng
//   COL_SEAM  = màu khe tối
// ─────────────────────────────────────────────────────────────────────────────

// ── Noise helpers ─────────────────────────────────────────────────────────────

// hash 1D → 1D
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

// hash 2D → 1D
float hash21(vec2 p) {
    p = fract(p * vec2(0.1031, 0.1030));
    p += dot(p, p.yx + 33.33);
    return fract((p.x + p.y) * p.x);
}

// Smooth noise 1D — dùng cho grain dọc trục X
float noise1(float x) {
    float i = floor(x);
    float f = fract(x);
    float u = f * f * (3.0 - 2.0 * f); // smoothstep
    return mix(hash11(i), hash11(i + 1.0), u);
}

// Smooth noise 2D — fbm grain
float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// 2-octave fbm — vân gỗ chính
float woodGrain(vec2 p) {
    float n = noise2(p)             * 0.60
            + noise2(p * 2.1 + 7.3) * 0.30
            + noise2(p * 4.7 + 3.1) * 0.10;
    return n;
}

// ── Main ──────────────────────────────────────────────────────────────────────

#define PLANK_H   0.14   // chiều cao 1 ván
#define SEAM_H    0.012  // khe hở
#define GRAIN_AMP 0.22   // cường độ vân gỗ
#define GRAIN_SCALE 8.0  // tần suất vân (lớn = vân dày hơn)
#define ROUGH     0.04   // micro-roughness ngẫu nhiên

// màu
const vec3 COL_WOOD  = vec3(0.72, 0.52, 0.30); // gỗ tươi sáng
const vec3 COL_DARK  = vec3(0.38, 0.24, 0.12); // vân tối / end-grain
const vec3 COL_SEAM  = vec3(0.18, 0.12, 0.08); // khe tối

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y; // giữ aspect ratio

    // ── Plank row ────────────────────────────────────────────────────────────
    float totalH = PLANK_H + SEAM_H;
    float rowF   = uv.y / totalH;
    float rowIdx = floor(rowF);               // row index (integer)
    float rowLocal = fract(rowF);             // 0..1 trong 1 ván

    // Khe hở ở đỉnh mỗi ván
    float seamFrac = SEAM_H / totalH;         // phần khe trong 1 chu kỳ
    float isSeam = step(1.0 - seamFrac, rowLocal);

    // ── Per-row X offset (stagger so boards don't line up) ───────────────────
    float xShift = hash11(rowIdx + 17.0) * 0.4; // mỗi row dịch X ngẫu nhiên

    // Normalized X trong row (với offset)
    float ux = fract(uv.x + xShift);

    // ── Wood grain ───────────────────────────────────────────────────────────
    // Grain chạy dọc theo X, bị nhiễu nhẹ theo Y
    vec2 grainP = vec2(uv.x * GRAIN_SCALE, uv.y * 0.5 + rowIdx * 0.3);
    float grain = woodGrain(grainP);

    // Thêm warp nhẹ — grain uốn cong tự nhiên hơn
    float warp = noise2(vec2(uv.x * 3.0, uv.y * 0.2)) * 0.8;
    grain = woodGrain(grainP + vec2(warp * 0.3, 0.0));

    // ── End-grain darkness (cạnh ván) ────────────────────────────────────────
    // Tối dần ở 2 cạnh của mỗi plank (ux ≈ 0 và ux ≈ 1)
    float edgeDark = 1.0 - smoothstep(0.0, 0.08, ux)
                         + smoothstep(0.92, 1.0, ux);
    edgeDark = clamp(edgeDark * 0.6, 0.0, 1.0);

    // ── Roughness variation ──────────────────────────────────────────────────
    float rough = hash21(vec2(uv.x * 23.7, rowIdx + uv.y * 100.0)) * ROUGH;

    // ── Assemble wood color ──────────────────────────────────────────────────
    // grain: 0 = nhạt, 1 = tối vân
    float grainFactor = grain * GRAIN_AMP;
    vec3 woodCol = mix(COL_WOOD, COL_DARK, grainFactor + edgeDark + rough);

    // ── Per-row hue variation (mỗi ván hơi khác màu) ─────────────────────────
    float rowHue = (hash11(rowIdx * 3.7) - 0.5) * 0.08;
    woodCol += vec3(rowHue * 0.5, rowHue * 0.3, -rowHue * 0.1);

    // ── Final: seam override ─────────────────────────────────────────────────
    vec3 col = mix(woodCol, COL_SEAM, isSeam);

    fragColor = vec4(col, 1.0);
}
