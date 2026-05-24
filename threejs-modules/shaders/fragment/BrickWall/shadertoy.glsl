// BrickWall — Shadertoy reference shader
// Phase 6 | 01-Doraemon Building System
// Phiên bản GLSL để tune visually trên Shadertoy trước khi port sang TSL.
//
// === COPY TOÀN BỘ FILE NÀY VÀO shadertoy.com/new ===
//
// Những gì cần tune:
//   BRICK_W / BRICK_H  — kích thước gạch (world units)
//   MORTAR             — độ dày mạch vữa
//   VARIATION          — biến thiên màu sắc giữa các viên gạch
//   ROUGH              — noise bề mặt (texture micro-grain)
//   SCALE              — zoom level (world units hiển thị trên màn hình)
//   COL_BRICK          — màu gạch cơ bản
//   COL_MORTAR         — màu vữa

// ── Tune params ──────────────────────────────────────────────────────────────

const float BRICK_W   = 0.40;  // brick width  (metres)
const float BRICK_H   = 0.20;  // brick height (metres)
const float MORTAR    = 0.015; // mortar joint thickness
const float VARIATION = 0.08;  // per-brick lightness variation [0, 0.2]
const float ROUGH     = 0.025; // surface micro-roughness amplitude
const float SCALE     = 3.0;   // world units visible (smaller = zoom in)

const vec3 COL_BRICK  = vec3(0.72, 0.38, 0.26);  // terra cotta
const vec3 COL_MORTAR = vec3(0.78, 0.76, 0.72);  // light grey cement

// ── Hash 2D → float [0,1] ─────────────────────────────────────────────────────

float hash21(vec2 p) {
    p  = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// ── Brick pattern ─────────────────────────────────────────────────────────────
//
// Returns vec3(isBrick, brickVariation, roughness)
//   isBrick:       0 = mortar joint, 1 = brick face  (smooth ramp via smoothstep)
//   brickVariation: per-brick lightness offset [-VARIATION/2, +VARIATION/2]
//   roughness:     micro-grain noise on brick face

vec3 brickPattern(vec2 p) {
    vec2 bm = vec2(BRICK_W + MORTAR, BRICK_H + MORTAR);

    // Scale to brick+mortar grid
    vec2 s = p / bm;

    // Running bond: offset every other row by half brick
    float row     = floor(s.y);
    float stagger = step(0.5, fract(row * 0.5)) * 0.5;

    // Local position within brick cell [0, 1]
    vec2  local  = fract(vec2(s.x + stagger, s.y));
    vec2  cellId = floor(vec2(s.x + stagger, s.y));

    // Distance to nearest mortar joint (both axes)
    vec2  dEdge  = min(local, 1.0 - local);
    float minD   = min(dEdge.x, dEdge.y);

    // Mortar fraction in cell-space; smoothstep gives crisp yet AA'd edge
    float mFrac   = MORTAR / bm.x;
    float isBrick = smoothstep(0.0, mFrac * 2.5, minD);

    // Per-brick lightness variation (different seed from edge hash)
    float bVar = (hash21(cellId + vec2(3.1, 7.9)) - 0.5) * VARIATION;

    // Micro-roughness: hash at higher frequency on world position
    float rough = (hash21(p * 18.3 + vec2(1.23, 4.56)) - 0.5) * ROUGH;

    return vec3(isBrick, bVar, rough);
}

// ── Main ──────────────────────────────────────────────────────────────────────

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // Aspect-correct + scale to world units
    uv.x *= iResolution.x / iResolution.y;
    vec2 p = uv * SCALE;

    vec3  b       = brickPattern(p);
    float isBrick = b.x;
    float bVar    = b.y;
    float rough   = b.z;

    // Brick: base color + per-brick variation + micro roughness
    vec3 brickCol  = COL_BRICK + vec3(bVar + rough);

    // Mortar: slightly darker in joint shadow, lighter at centre
    vec3 mortarCol = COL_MORTAR * mix(0.80, 1.0, isBrick);

    vec3 col = mix(mortarCol, brickCol, isBrick);

    // Ambient occlusion: darken near mortar joints
    col *= 0.88 + 0.12 * isBrick;

    // Linear → sRGB (Shadertoy expects linear output, monitor does the gamma)
    fragColor = vec4(col, 1.0);
}
