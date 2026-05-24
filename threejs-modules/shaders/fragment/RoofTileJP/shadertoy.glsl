// RoofTileJP — Shadertoy reference shader
// Phase 6 | 01-Doraemon Building System
// Ngói Nhật kiểu S (kawara 瓦): sdRoundBox per ngói + opRep offset row
//
// === COPY TOÀN BỘ FILE NÀY VÀO shadertoy.com/new ===
//
// Tune params:
//   TILE_W / TILE_H  — kích thước ngói (world units)
//   RIDGE_H          — chiều cao gờ cong của ngói (hình S)
//   GAP              — khe hở giữa các viên ngói
//   SCALE            — zoom level

// ── Tune params ──────────────────────────────────────────────────────────────

const float TILE_W   = 0.28;   // ngói width  (metres)
const float TILE_H   = 0.34;   // ngói height (length along slope)
const float RIDGE_H  = 0.040;  // chiều cao gờ cong (S-profile peak)
const float GAP      = 0.008;  // khe hở giữa ngói
const float SCALE    = 2.5;    // world units visible

const vec3 COL_TILE  = vec3(0.22, 0.22, 0.24);   // ngói đen xám (Japanese kawara)
const vec3 COL_RIDGE = vec3(0.18, 0.18, 0.19);   // gờ tối hơn (shadow)
const vec3 COL_GAP   = vec3(0.12, 0.11, 0.11);   // khe tối nhất

// ── Hash ─────────────────────────────────────────────────────────────────────

float hash21(vec2 p) {
    p  = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// ── SDF rounded box 2D ───────────────────────────────────────────────────────
// IQ sdRoundBox equivalent in 2D UV space
// p: position relative to box centre; b: half-extents; r: corner radius
// Returns signed distance (negative = inside)

float sdRoundBox2D(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

// ── Ngói S-profile (simulated via 2D height field) ───────────────────────────
//
// Pattern per row:
//   Col ngói: chạy theo X với bước TILE_W + GAP
//   Row offset: hàng lẻ lệch TILE_W/2 (giống running bond ngang)
//   S-profile: cos wave theo trục X tạo gờ + lõm luân phiên
//
// Returns vec3(isGap, ridgeLight, tileVar):
//   isGap:      1 = tile face, 0 = gap
//   ridgeLight: SDF-derived shading (gờ sáng hơn, lõm tối hơn)
//   tileVar:    per-tile variation

vec3 roofTilePattern(vec2 p) {
    float cellW = TILE_W + GAP;
    float cellH = TILE_H + GAP;

    // Row index for stagger
    float row     = floor(p.y / cellH);
    float stagger = mod(row, 2.0) * (TILE_W * 0.5);

    // Local coords in tile cell [0, 1]
    vec2  s     = vec2((p.x + stagger) / cellW, p.y / cellH);
    vec2  local = fract(s);
    vec2  cellId = floor(s);

    // Gap: distance to nearest cell edge
    vec2  dEdge  = min(local, 1.0 - local);
    float minD   = min(dEdge.x, dEdge.y);
    float gFrac  = GAP / cellW;
    float isGap  = 1.0 - smoothstep(0.0, gFrac * 2.5, minD); // 1 = gap, 0 = tile

    // Tile local space: centre at (0,0), half-extents (0.5, 0.5)
    vec2 tileLocal = local - 0.5;

    // SDF rounded box for ngói shape
    float r    = 0.06;  // corner radius in cell-fraction space
    float sdf  = sdRoundBox2D(tileLocal, vec2(0.5 - r, 0.5 - r), r);
    // Outside the rounded tile → also gap
    isGap = max(isGap, step(0.0, sdf));  // sdf > 0 = outside tile

    // S-profile shading: cosine along X axis of tile local space
    // cos(lx * PI): 1 at centre, -1 at edges → simulate curved surface
    float lx        = tileLocal.x * 3.14159;
    float sCurve    = cos(lx);              // [-1, 1]
    float ridgeLight = sCurve * 0.5 + 0.5; // [0, 1]: 1 = gờ cao, 0 = lõm

    // Remap: gờ nhận ánh sáng bên, lõm tối hơn
    ridgeLight = ridgeLight * ridgeLight; // quadratic falloff = more contrast

    // Per-tile variation (subtle ageing / colour variation)
    float tileVar = (hash21(cellId + vec2(5.3, 9.1)) - 0.5) * 0.04;

    return vec3(1.0 - isGap, ridgeLight, tileVar);
}

// ── Main ──────────────────────────────────────────────────────────────────────

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv  = fragCoord / iResolution.xy;
    uv.x    *= iResolution.x / iResolution.y;
    vec2 p   = uv * SCALE;

    vec3  t       = roofTilePattern(p);
    float isTile  = t.x;   // 1 = tile, 0 = gap
    float ridge   = t.y;   // 0 = lõm, 1 = gờ
    float tileVar = t.z;

    // Base tile colour + per-tile variation
    vec3 tileCol  = mix(COL_RIDGE, COL_TILE, ridge) + vec3(tileVar);

    // Mix with gap colour
    vec3 col = mix(COL_GAP, tileCol, isTile);

    // AO at tile edges
    col *= 0.85 + 0.15 * isTile;

    fragColor = vec4(col, 1.0);
}
