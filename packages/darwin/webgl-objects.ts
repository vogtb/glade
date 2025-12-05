// symbol to store internal GL handle
export const GL_HANDLE = Symbol("GL_HANDLE");

/**
 * Base class for WebGL objects. Stores the native OpenGL handle internally.
 */
abstract class WebGLObjectBase {
  readonly [GL_HANDLE]: number;

  constructor(handle: number) {
    this[GL_HANDLE] = handle;
  }
}

/** WebGL buffer object wrapper */
export class DarwinWebGLBuffer extends WebGLObjectBase {}

/** WebGL shader object wrapper */
export class DarwinWebGLShader extends WebGLObjectBase {}

/** WebGL program object wrapper */
export class DarwinWebGLProgram extends WebGLObjectBase {}

/** WebGL texture object wrapper */
export class DarwinWebGLTexture extends WebGLObjectBase {}

/** WebGL framebuffer object wrapper */
export class DarwinWebGLFramebuffer extends WebGLObjectBase {}

/** WebGL renderbuffer object wrapper */
export class DarwinWebGLRenderbuffer extends WebGLObjectBase {}

/** WebGL uniform location wrapper (can be -1 for invalid) */
export class DarwinWebGLUniformLocation {
  readonly [GL_HANDLE]: number;

  constructor(handle: number) {
    this[GL_HANDLE] = handle;
  }
}

/** WebGL active info (for getActiveAttrib/getActiveUniform) */
export class DarwinWebGLActiveInfo implements WebGLActiveInfo {
  constructor(
    public readonly name: string,
    public readonly size: GLint,
    public readonly type: GLenum
  ) {}
}

/** WebGL shader precision format */
export class DarwinWebGLShaderPrecisionFormat implements WebGLShaderPrecisionFormat {
  constructor(
    public readonly rangeMin: GLint,
    public readonly rangeMax: GLint,
    public readonly precision: GLint
  ) {}
}

// WebGL2-specific object wrappers

/** WebGL2 vertex array object wrapper */
export class DarwinWebGLVertexArrayObject extends WebGLObjectBase {}

/** WebGL2 query object wrapper */
export class DarwinWebGLQuery extends WebGLObjectBase {}

/** WebGL2 sampler object wrapper */
export class DarwinWebGLSampler extends WebGLObjectBase {}

/** WebGL2 sync object wrapper (uses pointer, not GLuint) */
export class DarwinWebGLSync {
  readonly [GL_HANDLE]: number; // Actually a pointer

  constructor(handle: number) {
    this[GL_HANDLE] = handle;
  }
}

/** WebGL2 transform feedback object wrapper */
export class DarwinWebGLTransformFeedback extends WebGLObjectBase {}

/**
 * Extract the native GL handle from a WebGL object.
 * Returns 0 for null objects.
 */
export function getHandle(
  obj:
    | WebGLBuffer
    | WebGLShader
    | WebGLProgram
    | WebGLTexture
    | WebGLFramebuffer
    | WebGLRenderbuffer
    | WebGLUniformLocation
    | WebGLVertexArrayObject
    | WebGLQuery
    | WebGLSampler
    | WebGLSync
    | WebGLTransformFeedback
    | null
    | undefined
): number {
  if (obj == null) return 0;
  return (obj as { [GL_HANDLE]: number })[GL_HANDLE] ?? 0;
}
