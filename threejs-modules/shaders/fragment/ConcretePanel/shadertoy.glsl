// ConcretePanel — Shadertoy reference shader
// Phase 6 | 01-Doraemon Building System
// Bê tông tấm panel: seam joints + fbm surface variation + micro roughness
//
// === COPY TOÀN BỘ FILE NÀY VÀO shadertoy.com/new ===
//
// Tune params:
//   PANEL_W / PANEL_H  — kích thước tấm panel (world units)
//   SEAM_W             — độ rộng khe nối (seam joint)
//   FBM_AMP            — biến thiên màu bề mặt (pour variation)
//   ROUGH              — micro roughness
//   SCALE              — zoom level

// ── Tune params ──────────────────────────────────────────────────────────────

const float PANEL_W  = 1.20;   // panel width  (metres)
const float PANEL_H  = 2.40;   // panel height (metres)
const float SEAM_W   = 0.010;  // seam joint width (metres) — groove giữa tấm
const float FBM_AMP  = 0.055;  // fbm colour variation amplitude [0, 0.15]
const float ROUGH    = 0.018;  // micro roughness [0, 0.05]
const float SCALE    = 6.0;    // world units visible

const vec3 COL_BASE  = vec3(0.68, 0.67, 0.64);  // concrete grey
const vec3 COL_SEAM  = vec3(0.44, 0.43, 0.41);  // darker seam groove

// ── Hash ─────────────────────────────────────────────────────────────────────

float hash21(vec2 p) {
    p  = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// ── FBM — 3 octaves ──────────────────────────────────────────────────────────
// smooth variation simulating concrete pour / aggregate distribution

float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2  s = p;
    for (int i = 0; i < 3; i++) {
        v += a * hash21(floor(s) + vec2(0.5));  // lattice hash (flat-shaded cell noise)
        s *= 2.1;
        a *= 0.48;
    }
    return v / 0.97;  // approx normalize to [0, 1]
}

// ── Panel seam ───────────────────────────────────────────────────────────────
//
// Returns isPanel [0, 1]: 0 = seam groove, 1 = panel face.
// No running-bond stagger — panels are a regular grid.

float panelSeam(vec2 p) {
    vec2 cell  = vec2(PANEL_W, PANEL_H);
    vec2 s     = p / cell;
    vec2 local = fract(s);                   // [0,1] in panel cell

    // Distance to nearest seam edge (both axes)
    vec2  dEdge  = min(local, 1.0 - local);
    float minD   = min(dEdge.x, dEdge.y);

    // Seam fraction in cell space
    float sFrac  = SEAM_W / cell.x;
    return smoothstep(0.0, sFrac * 2.5, minD);   // 0 = seam, 1 = panel
}

// ── Main ──────────────────────────────────────────────────────────────────────

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv  = fragCoord / iResolution.xy;
    uv.x    *= iResolution.x / iResolution.y;
    vec2 p   = uv * SCALE;

    float isPanel = panelSeam(p);

    // fbm surface variation — low frequency (pour / aggregate)
    float surf = (fbm(p * 0.9) - 0.5) * FBM_AMP;

    // Micro roughness — high frequency
    float rough = (hash21(p * 22.0 + vec2(3.1, 7.9)) - 0.5) * ROUGH;

    // Combine
    vec3 panelCol = COL_BASE + vec3(surf + rough);

    // Panel face + seam blend; seam is recessed → no roughness
    vec3 col = mix(COL_SEAM, panelCol, isPanel);

    // Subtle AO at seam edges
    col *= 0.90 + 0.10 * isPanel;

    fragColor = vec4(col, 1.0);
}
