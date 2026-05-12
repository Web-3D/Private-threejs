interface RendererInfo {
  info: {
    render: { calls: number; drawCalls: number; triangles: number }
    memory: { geometries: number; textures: number }
  }
}

interface GuardOptions {
  drawCallLimit: number
  triangleLimit: number
}

export class RuntimeGuard {
  private options: GuardOptions
  private prevGeometries = 0
  private leakFrames = 0
  private prevTextures = 0
  private textureLeakFrames = 0
  private isDisposed = false

  constructor(
    private renderer: RendererInfo,
    options?: Partial<GuardOptions>
  ) {
    this.options = {
      drawCallLimit: options?.drawCallLimit ?? 100,
      triangleLimit: options?.triangleLimit ?? 500_000,
    }
  }

  check(): void {
    if (this.isDisposed) return
    const { render, memory } = this.renderer.info

    if (render.drawCalls > this.options.drawCallLimit)
      console.warn(`[Budget] Draw calls: ${render.drawCalls}/${this.options.drawCallLimit}`)

    if (render.triangles > this.options.triangleLimit)
      console.warn(`[Budget] Triangles: ${render.triangles}/${this.options.triangleLimit}`)

    if (memory.geometries > this.prevGeometries) {
      this.leakFrames++
      if (this.leakFrames >= 3)
        console.warn(
          `[Budget] Geometry leak? Count rising: ${memory.geometries} (${this.leakFrames} frames)`
        )
    } else {
      this.leakFrames = 0
    }

    this.prevGeometries = memory.geometries

    if (memory.textures > this.prevTextures) {
      this.textureLeakFrames++
      if (this.textureLeakFrames >= 3)
        console.warn(
          `[Budget] Texture leak? Count rising: ${memory.textures} (${this.textureLeakFrames} frames)`
        )
    } else {
      this.textureLeakFrames = 0
    }

    this.prevTextures = memory.textures
  }

  dispose(): void {
    if (this.isDisposed) return
    this.isDisposed = true
  }
}

// Type export cho World class dùng khi khai báo
export type { GuardOptions, RendererInfo }
