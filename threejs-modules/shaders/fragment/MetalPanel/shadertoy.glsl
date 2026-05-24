// ─────────────────────────────────────────────────────────────────────────────
// MetalPanel — Shadertoy reference (paste tại shadertoy.com/new)
//
// Technique:
//   • Horizontal corrugated ridges — opRep theo Y với profile sinusoidal
//   • Panel seam theo X — vertical cut mỗi N ridges
//   • Specular highlight trên đỉnh ridge — cosine shading
//   • Crease line ở đáy mỗi ridge — smoothstep dark groove
//   • Galvanized variation — hash noise ±brightness nhỏ per panel
//   • Rust/wear — triNoise tại cạnh panel và vùng thấp
//
// Tune:
//   RIDGE_H  = chiều cao 1 ridge (0.04–0.12)
//   SEAM_W   = độ rộng vertical panel seam (0.005–0.015)
//   PANEL_W  = bao nhiêu ridges mỗi panel (6–12)
//   COL_METAL = màu kim loại cơ bản
//   COL_SEAM  = màu khe tối
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ───────────────────────────────────────────────────────────────────

float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p) {
    p = fract(p * vec2(0.1031, 0.1030));
    p += dot(p, p.yx + 33.33);
    return fract((p.x + p.y) * p.x);
}

float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash21(i), hash21(i + vec2(1,0)), u.x),
        mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x),
        u.y
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────

#define RIDGE_H   0.06   // chiều cao 1 ridge (metres)
#define SEAM_W    0.008  // vertical seam width (fraction of ridgeH)
#define RIDGES_PER_PANEL 8.0  // số ridges mỗi panel rộng
#define RIDGE_PROFILE 0.7 // bao nhiêu % ridge là phần tròn (0.5–0.9)

// màu
const vec3 COL_METAL = vec3(0.72, 0.74, 0.73); // galvanized steel
const vec3 COL_DARK  = vec3(0.38, 0.38, 0.38); // groove / shadow
const vec3 COL_SEAM  = vec3(0.22, 0.22, 0.22); // panel join
const vec3 COL_RUST  = vec3(0.60, 0.32, 0.14); // rust variation

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y;

    // Scale UV — 1 unit = 1 metre world space tại scale=1
    vec2 p = uv * 4.0;

    // ── Ridges (horizontal repeat) ────────────────────────────────────────────
    float ridgeF   = p.y / RIDGE_H;
    float ridgeIdx = floor(ridgeF);
    float ridgeLoc = fract(ridgeF);   // 0..1 trong 1 ridge

    // Profile: sinusoidal crown + flat valley
    // Phần cao = RIDGE_PROFILE, valley = 1-RIDGE_PROFILE
    float profile;
    if (ridgeLoc < RIDGE_PROFILE) {
        // crown: 0 đến RIDGE_PROFILE → cosine arch
        float t = ridgeLoc / RIDGE_PROFILE;
        profile = sin(t * 3.14159) * 0.5 + 0.5; // 0→peak→0
    } else {
        profile = 0.0; // flat valley
    }

    // Crease at valley: dark groove ở chân ridge
    float creaseWidth = 0.04;
    float crease = 1.0 - smoothstep(0.0, creaseWidth, ridgeLoc)
                       * smoothstep(RIDGE_PROFILE + creaseWidth, RIDGE_PROFILE, ridgeLoc);

    // ── Panel vertical seams ──────────────────────────────────────────────────
    float panelW    = RIDGES_PER_PANEL * RIDGE_H; // panel width in metres
    float panelF    = p.x / panelW;
    float panelIdx  = floor(panelF);
    float panelLoc  = fract(panelF);

    float isSeam = step(1.0 - SEAM_W / RIDGE_H, panelLoc);  // seam at right edge

    // ── Per-panel galvanized variation ────────────────────────────────────────
    float panelHash = hash11(panelIdx + ridgeIdx * 0.1) - 0.5;
    float metalVar  = panelHash * 0.06; // ±3% brightness

    // ── Specular highlight on ridge crown ─────────────────────────────────────
    // Đỉnh ridge bắt sáng — simulate highlight ở profile peak
    float highlight = pow(profile, 3.0) * 0.25;

    // ── Rust wear at bottom of ridges ─────────────────────────────────────────
    float rustNoise = noise2(p * vec2(3.0, 8.0) + 7.3);
    float rustMask  = smoothstep(0.55, 0.75, rustNoise) * 0.4;  // sparse spots
    // Rust heavier ở valley (profile = 0)
    rustMask *= (1.0 - profile) * 1.5;
    rustMask = clamp(rustMask, 0.0, 1.0);

    // ── Assemble ──────────────────────────────────────────────────────────────
    vec3 baseCol = COL_METAL + metalVar;

    // Ridge shading: crown lighter, valley darker
    vec3 ridgeCol = mix(COL_DARK, baseCol, 0.5 + profile * 0.5);

    // Add highlight
    ridgeCol += highlight;

    // Crease darkening
    ridgeCol *= (0.7 + crease * 0.3);

    // Rust spots
    ridgeCol = mix(ridgeCol, COL_RUST, rustMask);

    // Seam override
    vec3 finalCol = mix(ridgeCol, COL_SEAM, isSeam);

    fragColor = vec4(finalCol, 1.0);
}
