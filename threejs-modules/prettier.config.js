/** @type {import('prettier').Config} */
export default {
  // ─── Độ rộng & Thụt lề ────────────────────────────────────────────────
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,

  // ─── Dấu câu & Chuỗi ──────────────────────────────────────────────────
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',

  // ─── Khoảng trắng ─────────────────────────────────────────────────────
  bracketSpacing: true,
  arrowParens: 'always',

  // ─── Xuống dòng ───────────────────────────────────────────────────────
  endOfLine: 'lf',

  overrides: [
    {
      files: ['*.glsl', '*.vert', '**/*.frag', '*.wgsl'],
      options: { printWidth: 120 },
    },
    {
      files: ['*.json'],
      options: { trailingComma: 'none' },
    },
  ],
}
