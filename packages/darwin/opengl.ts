import { dlopen, FFIType, ptr } from "bun:ffi";

const GL_PATH = "/System/Library/Frameworks/OpenGL.framework/OpenGL";

export const lib = dlopen(GL_PATH, {
  // State management
  glEnable: { args: [FFIType.u32], returns: FFIType.void },
  glDisable: { args: [FFIType.u32], returns: FFIType.void },
  glIsEnabled: { args: [FFIType.u32], returns: FFIType.u8 },
  glGetError: { args: [], returns: FFIType.u32 },
  glHint: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glGetIntegerv: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetFloatv: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetBooleanv: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetString: { args: [FFIType.u32], returns: FFIType.ptr },
  glGetStringi: { args: [FFIType.u32, FFIType.u32], returns: FFIType.ptr },

  // Viewing & Clipping
  glScissor: { args: [FFIType.i32, FFIType.i32, FFIType.i32, FFIType.i32], returns: FFIType.void },
  glViewport: { args: [FFIType.i32, FFIType.i32, FFIType.i32, FFIType.i32], returns: FFIType.void },

  // Blending
  glBlendColor: {
    args: [FFIType.f32, FFIType.f32, FFIType.f32, FFIType.f32],
    returns: FFIType.void,
  },
  glBlendEquation: { args: [FFIType.u32], returns: FFIType.void },
  glBlendEquationSeparate: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glBlendFunc: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glBlendFuncSeparate: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },

  // Color, Depth & Stencil
  glClearColor: {
    args: [FFIType.f32, FFIType.f32, FFIType.f32, FFIType.f32],
    returns: FFIType.void,
  },
  glClearDepth: { args: [FFIType.f64], returns: FFIType.void },
  glClearStencil: { args: [FFIType.i32], returns: FFIType.void },
  glColorMask: { args: [FFIType.u8, FFIType.u8, FFIType.u8, FFIType.u8], returns: FFIType.void },
  glDepthFunc: { args: [FFIType.u32], returns: FFIType.void },
  glDepthMask: { args: [FFIType.u8], returns: FFIType.void },
  glDepthRange: { args: [FFIType.f64, FFIType.f64], returns: FFIType.void },

  // Face Culling
  glCullFace: { args: [FFIType.u32], returns: FFIType.void },
  glFrontFace: { args: [FFIType.u32], returns: FFIType.void },

  // Stencil Operations
  glStencilFunc: { args: [FFIType.u32, FFIType.i32, FFIType.u32], returns: FFIType.void },
  glStencilFuncSeparate: {
    args: [FFIType.u32, FFIType.u32, FFIType.i32, FFIType.u32],
    returns: FFIType.void,
  },
  glStencilMask: { args: [FFIType.u32], returns: FFIType.void },
  glStencilMaskSeparate: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glStencilOp: { args: [FFIType.u32, FFIType.u32, FFIType.u32], returns: FFIType.void },
  glStencilOpSeparate: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },

  // Line & Polygon
  glLineWidth: { args: [FFIType.f32], returns: FFIType.void },
  glPolygonOffset: { args: [FFIType.f32, FFIType.f32], returns: FFIType.void },

  // Texture Management
  glActiveTexture: { args: [FFIType.u32], returns: FFIType.void },
  glBindTexture: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glGenTextures: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glDeleteTextures: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glIsTexture: { args: [FFIType.u32], returns: FFIType.u8 },
  glGenerateMipmap: { args: [FFIType.u32], returns: FFIType.void },
  glTexParameterf: { args: [FFIType.u32, FFIType.u32, FFIType.f32], returns: FFIType.void },
  glTexParameteri: { args: [FFIType.u32, FFIType.u32, FFIType.i32], returns: FFIType.void },
  glGetTexParameteriv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetTexParameterfv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glTexImage2D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.u32,
      FFIType.u32,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },
  glTexSubImage2D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.u32,
      FFIType.u32,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },
  glCopyTexImage2D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
    ],
    returns: FFIType.void,
  },
  glCopyTexSubImage2D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
    ],
    returns: FFIType.void,
  },
  glCompressedTexImage2D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },
  glCompressedTexSubImage2D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.u32,
      FFIType.i32,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },

  // WebGL2 3D Textures
  glTexImage3D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.u32,
      FFIType.u32,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },
  glTexSubImage3D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.u32,
      FFIType.u32,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },
  glCopyTexSubImage3D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
    ],
    returns: FFIType.void,
  },
  glCompressedTexImage3D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },
  glCompressedTexSubImage3D: {
    args: [
      FFIType.u32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.u32,
      FFIType.i32,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },
  glTexStorage2D: {
    args: [FFIType.u32, FFIType.i32, FFIType.u32, FFIType.i32, FFIType.i32],
    returns: FFIType.void,
  },
  glTexStorage3D: {
    args: [FFIType.u32, FFIType.i32, FFIType.u32, FFIType.i32, FFIType.i32, FFIType.i32],
    returns: FFIType.void,
  },

  // Buffer Management
  glGenBuffers: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glDeleteBuffers: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glIsBuffer: { args: [FFIType.u32], returns: FFIType.u8 },
  glBindBuffer: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glBufferData: {
    args: [FFIType.u32, FFIType.i64, FFIType.ptr, FFIType.u32],
    returns: FFIType.void,
  },
  glBufferSubData: {
    args: [FFIType.u32, FFIType.i64, FFIType.i64, FFIType.ptr],
    returns: FFIType.void,
  },
  glGetBufferParameteriv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetBufferParameteri64v: {
    args: [FFIType.u32, FFIType.u32, FFIType.ptr],
    returns: FFIType.void,
  },
  glBindBufferBase: { args: [FFIType.u32, FFIType.u32, FFIType.u32], returns: FFIType.void },
  glBindBufferRange: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.i64, FFIType.i64],
    returns: FFIType.void,
  },
  glCopyBufferSubData: {
    args: [FFIType.u32, FFIType.u32, FFIType.i64, FFIType.i64, FFIType.i64],
    returns: FFIType.void,
  },
  glGetBufferSubData: {
    args: [FFIType.u32, FFIType.i64, FFIType.i64, FFIType.ptr],
    returns: FFIType.void,
  },

  // Framebuffer Operations
  glGenFramebuffers: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glDeleteFramebuffers: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glIsFramebuffer: { args: [FFIType.u32], returns: FFIType.u8 },
  glBindFramebuffer: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glCheckFramebufferStatus: { args: [FFIType.u32], returns: FFIType.u32 },
  glFramebufferTexture2D: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.u32, FFIType.i32],
    returns: FFIType.void,
  },
  glFramebufferRenderbuffer: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },
  glGetFramebufferAttachmentParameteriv: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.ptr],
    returns: FFIType.void,
  },
  glBlitFramebuffer: {
    args: [
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.u32,
      FFIType.u32,
    ],
    returns: FFIType.void,
  },
  glFramebufferTextureLayer: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.i32, FFIType.i32],
    returns: FFIType.void,
  },
  // glInvalidateFramebuffer and glInvalidateSubFramebuffer are OpenGL 4.3, not available on macOS
  glReadBuffer: { args: [FFIType.u32], returns: FFIType.void },
  glDrawBuffers: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glClearBufferfv: { args: [FFIType.u32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glClearBufferiv: { args: [FFIType.u32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glClearBufferuiv: { args: [FFIType.u32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glClearBufferfi: {
    args: [FFIType.u32, FFIType.i32, FFIType.f32, FFIType.i32],
    returns: FFIType.void,
  },

  // Renderbuffer Operations
  glGenRenderbuffers: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glDeleteRenderbuffers: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glIsRenderbuffer: { args: [FFIType.u32], returns: FFIType.u8 },
  glBindRenderbuffer: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glRenderbufferStorage: {
    args: [FFIType.u32, FFIType.u32, FFIType.i32, FFIType.i32],
    returns: FFIType.void,
  },
  glRenderbufferStorageMultisample: {
    args: [FFIType.u32, FFIType.i32, FFIType.u32, FFIType.i32, FFIType.i32],
    returns: FFIType.void,
  },
  glGetRenderbufferParameteriv: {
    args: [FFIType.u32, FFIType.u32, FFIType.ptr],
    returns: FFIType.void,
  },

  // Shader Management
  glCreateShader: { args: [FFIType.u32], returns: FFIType.u32 },
  glDeleteShader: { args: [FFIType.u32], returns: FFIType.void },
  glIsShader: { args: [FFIType.u32], returns: FFIType.u8 },
  glShaderSource: {
    args: [FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  glCompileShader: { args: [FFIType.u32], returns: FFIType.void },
  glGetShaderiv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetShaderInfoLog: {
    args: [FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  glGetShaderSource: {
    args: [FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },

  // Program Management
  glCreateProgram: { args: [], returns: FFIType.u32 },
  glDeleteProgram: { args: [FFIType.u32], returns: FFIType.void },
  glIsProgram: { args: [FFIType.u32], returns: FFIType.u8 },
  glAttachShader: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glDetachShader: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glLinkProgram: { args: [FFIType.u32], returns: FFIType.void },
  glUseProgram: { args: [FFIType.u32], returns: FFIType.void },
  glValidateProgram: { args: [FFIType.u32], returns: FFIType.void },
  glGetProgramiv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetProgramInfoLog: {
    args: [FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  glGetAttachedShaders: {
    args: [FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },

  // Attribute Management
  glBindAttribLocation: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glEnableVertexAttribArray: { args: [FFIType.u32], returns: FFIType.void },
  glDisableVertexAttribArray: { args: [FFIType.u32], returns: FFIType.void },
  glGetAttribLocation: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.i32 },
  glGetActiveAttrib: {
    args: [
      FFIType.u32,
      FFIType.u32,
      FFIType.i32,
      FFIType.ptr,
      FFIType.ptr,
      FFIType.ptr,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },
  glGetVertexAttribiv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetVertexAttribfv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetVertexAttribPointerv: {
    args: [FFIType.u32, FFIType.u32, FFIType.ptr],
    returns: FFIType.void,
  },
  glVertexAttrib1f: { args: [FFIType.u32, FFIType.f32], returns: FFIType.void },
  glVertexAttrib2f: { args: [FFIType.u32, FFIType.f32, FFIType.f32], returns: FFIType.void },
  glVertexAttrib3f: {
    args: [FFIType.u32, FFIType.f32, FFIType.f32, FFIType.f32],
    returns: FFIType.void,
  },
  glVertexAttrib4f: {
    args: [FFIType.u32, FFIType.f32, FFIType.f32, FFIType.f32, FFIType.f32],
    returns: FFIType.void,
  },
  glVertexAttrib1fv: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glVertexAttrib2fv: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glVertexAttrib3fv: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glVertexAttrib4fv: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glVertexAttribPointer: {
    args: [FFIType.u32, FFIType.i32, FFIType.u32, FFIType.u8, FFIType.i32, FFIType.ptr],
    returns: FFIType.void,
  },
  glVertexAttribIPointer: {
    args: [FFIType.u32, FFIType.i32, FFIType.u32, FFIType.i32, FFIType.ptr],
    returns: FFIType.void,
  },
  glVertexAttribI4i: {
    args: [FFIType.u32, FFIType.i32, FFIType.i32, FFIType.i32, FFIType.i32],
    returns: FFIType.void,
  },
  glVertexAttribI4ui: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },
  glVertexAttribI4iv: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glVertexAttribI4uiv: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glVertexAttribDivisor: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },

  // Uniform Management
  glGetUniformLocation: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.i32 },
  glGetActiveUniform: {
    args: [
      FFIType.u32,
      FFIType.u32,
      FFIType.i32,
      FFIType.ptr,
      FFIType.ptr,
      FFIType.ptr,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },
  glGetUniformfv: { args: [FFIType.u32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glGetUniformiv: { args: [FFIType.u32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glGetUniformuiv: { args: [FFIType.u32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform1f: { args: [FFIType.i32, FFIType.f32], returns: FFIType.void },
  glUniform2f: { args: [FFIType.i32, FFIType.f32, FFIType.f32], returns: FFIType.void },
  glUniform3f: {
    args: [FFIType.i32, FFIType.f32, FFIType.f32, FFIType.f32],
    returns: FFIType.void,
  },
  glUniform4f: {
    args: [FFIType.i32, FFIType.f32, FFIType.f32, FFIType.f32, FFIType.f32],
    returns: FFIType.void,
  },
  glUniform1i: { args: [FFIType.i32, FFIType.i32], returns: FFIType.void },
  glUniform2i: { args: [FFIType.i32, FFIType.i32, FFIType.i32], returns: FFIType.void },
  glUniform3i: {
    args: [FFIType.i32, FFIType.i32, FFIType.i32, FFIType.i32],
    returns: FFIType.void,
  },
  glUniform4i: {
    args: [FFIType.i32, FFIType.i32, FFIType.i32, FFIType.i32, FFIType.i32],
    returns: FFIType.void,
  },
  glUniform1ui: { args: [FFIType.i32, FFIType.u32], returns: FFIType.void },
  glUniform2ui: { args: [FFIType.i32, FFIType.u32, FFIType.u32], returns: FFIType.void },
  glUniform3ui: {
    args: [FFIType.i32, FFIType.u32, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },
  glUniform4ui: {
    args: [FFIType.i32, FFIType.u32, FFIType.u32, FFIType.u32, FFIType.u32],
    returns: FFIType.void,
  },
  glUniform1fv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform2fv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform3fv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform4fv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform1iv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform2iv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform3iv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform4iv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform1uiv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform2uiv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform3uiv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniform4uiv: { args: [FFIType.i32, FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glUniformMatrix2fv: {
    args: [FFIType.i32, FFIType.i32, FFIType.u8, FFIType.ptr],
    returns: FFIType.void,
  },
  glUniformMatrix3fv: {
    args: [FFIType.i32, FFIType.i32, FFIType.u8, FFIType.ptr],
    returns: FFIType.void,
  },
  glUniformMatrix4fv: {
    args: [FFIType.i32, FFIType.i32, FFIType.u8, FFIType.ptr],
    returns: FFIType.void,
  },
  glUniformMatrix2x3fv: {
    args: [FFIType.i32, FFIType.i32, FFIType.u8, FFIType.ptr],
    returns: FFIType.void,
  },
  glUniformMatrix3x2fv: {
    args: [FFIType.i32, FFIType.i32, FFIType.u8, FFIType.ptr],
    returns: FFIType.void,
  },
  glUniformMatrix2x4fv: {
    args: [FFIType.i32, FFIType.i32, FFIType.u8, FFIType.ptr],
    returns: FFIType.void,
  },
  glUniformMatrix4x2fv: {
    args: [FFIType.i32, FFIType.i32, FFIType.u8, FFIType.ptr],
    returns: FFIType.void,
  },
  glUniformMatrix3x4fv: {
    args: [FFIType.i32, FFIType.i32, FFIType.u8, FFIType.ptr],
    returns: FFIType.void,
  },
  glUniformMatrix4x3fv: {
    args: [FFIType.i32, FFIType.i32, FFIType.u8, FFIType.ptr],
    returns: FFIType.void,
  },

  // Uniform Block (WebGL2)
  glGetUniformBlockIndex: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.u32 },
  glGetActiveUniformBlockiv: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.ptr],
    returns: FFIType.void,
  },
  glGetActiveUniformBlockName: {
    args: [FFIType.u32, FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },
  glUniformBlockBinding: { args: [FFIType.u32, FFIType.u32, FFIType.u32], returns: FFIType.void },
  glGetActiveUniformsiv: {
    args: [FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.u32, FFIType.ptr],
    returns: FFIType.void,
  },
  glGetUniformIndices: {
    args: [FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },

  // Drawing Operations
  glClear: { args: [FFIType.u32], returns: FFIType.void },
  glDrawArrays: { args: [FFIType.u32, FFIType.i32, FFIType.i32], returns: FFIType.void },
  glDrawElements: {
    args: [FFIType.u32, FFIType.i32, FFIType.u32, FFIType.ptr],
    returns: FFIType.void,
  },
  glDrawArraysInstanced: {
    args: [FFIType.u32, FFIType.i32, FFIType.i32, FFIType.i32],
    returns: FFIType.void,
  },
  glDrawElementsInstanced: {
    args: [FFIType.u32, FFIType.i32, FFIType.u32, FFIType.ptr, FFIType.i32],
    returns: FFIType.void,
  },
  glDrawRangeElements: {
    args: [FFIType.u32, FFIType.u32, FFIType.u32, FFIType.i32, FFIType.u32, FFIType.ptr],
    returns: FFIType.void,
  },
  glFinish: { args: [], returns: FFIType.void },
  glFlush: { args: [], returns: FFIType.void },

  // Pixel Operations
  glPixelStorei: { args: [FFIType.u32, FFIType.i32], returns: FFIType.void },
  glReadPixels: {
    args: [
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.i32,
      FFIType.u32,
      FFIType.u32,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },

  // Vertex Array Objects (WebGL2)
  glGenVertexArrays: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glDeleteVertexArrays: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glIsVertexArray: { args: [FFIType.u32], returns: FFIType.u8 },
  glBindVertexArray: { args: [FFIType.u32], returns: FFIType.void },

  // Query Objects (WebGL2)
  glGenQueries: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glDeleteQueries: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glIsQuery: { args: [FFIType.u32], returns: FFIType.u8 },
  glBeginQuery: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glEndQuery: { args: [FFIType.u32], returns: FFIType.void },
  glGetQueryiv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetQueryObjectuiv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },

  // Sampler Objects (WebGL2)
  glGenSamplers: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glDeleteSamplers: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glIsSampler: { args: [FFIType.u32], returns: FFIType.u8 },
  glBindSampler: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glSamplerParameteri: { args: [FFIType.u32, FFIType.u32, FFIType.i32], returns: FFIType.void },
  glSamplerParameterf: { args: [FFIType.u32, FFIType.u32, FFIType.f32], returns: FFIType.void },
  glGetSamplerParameteriv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },
  glGetSamplerParameterfv: { args: [FFIType.u32, FFIType.u32, FFIType.ptr], returns: FFIType.void },

  // Sync Objects (WebGL2)
  glFenceSync: { args: [FFIType.u32, FFIType.u32], returns: FFIType.ptr },
  glIsSync: { args: [FFIType.ptr], returns: FFIType.u8 },
  glDeleteSync: { args: [FFIType.ptr], returns: FFIType.void },
  glClientWaitSync: { args: [FFIType.ptr, FFIType.u32, FFIType.u64], returns: FFIType.u32 },
  glWaitSync: { args: [FFIType.ptr, FFIType.u32, FFIType.u64], returns: FFIType.void },
  glGetSynciv: {
    args: [FFIType.ptr, FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.ptr],
    returns: FFIType.void,
  },

  // Transform Feedback (WebGL2)
  glGenTransformFeedbacks: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glDeleteTransformFeedbacks: { args: [FFIType.i32, FFIType.ptr], returns: FFIType.void },
  glIsTransformFeedback: { args: [FFIType.u32], returns: FFIType.u8 },
  glBindTransformFeedback: { args: [FFIType.u32, FFIType.u32], returns: FFIType.void },
  glBeginTransformFeedback: { args: [FFIType.u32], returns: FFIType.void },
  glEndTransformFeedback: { args: [], returns: FFIType.void },
  glPauseTransformFeedback: { args: [], returns: FFIType.void },
  glResumeTransformFeedback: { args: [], returns: FFIType.void },
  glTransformFeedbackVaryings: {
    args: [FFIType.u32, FFIType.i32, FFIType.ptr, FFIType.u32],
    returns: FFIType.void,
  },
  glGetTransformFeedbackVarying: {
    args: [
      FFIType.u32,
      FFIType.u32,
      FFIType.i32,
      FFIType.ptr,
      FFIType.ptr,
      FFIType.ptr,
      FFIType.ptr,
    ],
    returns: FFIType.void,
  },

  // Fragment Program Location (WebGL2)
  glGetFragDataLocation: { args: [FFIType.u32, FFIType.ptr], returns: FFIType.i32 },

  // Sample shading
  glSampleCoverage: { args: [FFIType.f32, FFIType.u8], returns: FFIType.void },
});

export type GLLib = typeof lib;

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

/**
 * Darwin implementation of WebGL2RenderingContext.
 * Wraps native OpenGL calls via FFI.
 *
 * Note: We don't use `implements WebGL2RenderingContext` because TypeScript's
 * WebGL2RenderingContext has many overloaded methods that are hard to match exactly.
 * Instead we ensure runtime compatibility with the WebGL2 API.
 */
export class DarwinWebGL2RenderingContext {
  // Canvas mock for compatibility
  readonly canvas: HTMLCanvasElement;
  drawingBufferWidth: number;
  drawingBufferHeight: number;
  drawingBufferColorSpace: PredefinedColorSpace = "srgb";

  constructor(width: number, height: number) {
    this.drawingBufferWidth = width;
    this.drawingBufferHeight = height;
    // Create a minimal canvas mock
    this.canvas = {
      width,
      height,
      clientWidth: width,
      clientHeight: height,
    } as HTMLCanvasElement;
  }

  // ============================================================
  // WebGL Constants
  // ============================================================

  // Clear buffer bits
  readonly DEPTH_BUFFER_BIT = 0x00000100;
  readonly STENCIL_BUFFER_BIT = 0x00000400;
  readonly COLOR_BUFFER_BIT = 0x00004000;

  // Boolean values
  readonly FALSE = 0;
  readonly TRUE = 1;

  // Primitive types
  readonly POINTS = 0x0000;
  readonly LINES = 0x0001;
  readonly LINE_LOOP = 0x0002;
  readonly LINE_STRIP = 0x0003;
  readonly TRIANGLES = 0x0004;
  readonly TRIANGLE_STRIP = 0x0005;
  readonly TRIANGLE_FAN = 0x0006;

  // Blending modes
  readonly ZERO = 0;
  readonly ONE = 1;
  readonly SRC_COLOR = 0x0300;
  readonly ONE_MINUS_SRC_COLOR = 0x0301;
  readonly SRC_ALPHA = 0x0302;
  readonly ONE_MINUS_SRC_ALPHA = 0x0303;
  readonly DST_ALPHA = 0x0304;
  readonly ONE_MINUS_DST_ALPHA = 0x0305;
  readonly DST_COLOR = 0x0306;
  readonly ONE_MINUS_DST_COLOR = 0x0307;
  readonly SRC_ALPHA_SATURATE = 0x0308;

  // Blend equations
  readonly FUNC_ADD = 0x8006;
  readonly BLEND_EQUATION = 0x8009;
  readonly BLEND_EQUATION_RGB = 0x8009;
  readonly BLEND_EQUATION_ALPHA = 0x883d;
  readonly FUNC_SUBTRACT = 0x800a;
  readonly FUNC_REVERSE_SUBTRACT = 0x800b;

  // Blend parameters
  readonly BLEND_DST_RGB = 0x80c8;
  readonly BLEND_SRC_RGB = 0x80c9;
  readonly BLEND_DST_ALPHA = 0x80ca;
  readonly BLEND_SRC_ALPHA = 0x80cb;
  readonly CONSTANT_COLOR = 0x8001;
  readonly ONE_MINUS_CONSTANT_COLOR = 0x8002;
  readonly CONSTANT_ALPHA = 0x8003;
  readonly ONE_MINUS_CONSTANT_ALPHA = 0x8004;
  readonly BLEND_COLOR = 0x8005;

  // Buffer objects
  readonly ARRAY_BUFFER = 0x8892;
  readonly ELEMENT_ARRAY_BUFFER = 0x8893;
  readonly ARRAY_BUFFER_BINDING = 0x8894;
  readonly ELEMENT_ARRAY_BUFFER_BINDING = 0x8895;
  readonly STREAM_DRAW = 0x88e0;
  readonly STATIC_DRAW = 0x88e4;
  readonly DYNAMIC_DRAW = 0x88e8;
  readonly BUFFER_SIZE = 0x8764;
  readonly BUFFER_USAGE = 0x8765;
  readonly CURRENT_VERTEX_ATTRIB = 0x8626;

  // Culling
  readonly FRONT = 0x0404;
  readonly BACK = 0x0405;
  readonly FRONT_AND_BACK = 0x0408;
  readonly CULL_FACE = 0x0b44;
  readonly BLEND = 0x0be2;
  readonly DITHER = 0x0bd0;
  readonly STENCIL_TEST = 0x0b90;
  readonly DEPTH_TEST = 0x0b71;
  readonly SCISSOR_TEST = 0x0c11;
  readonly POLYGON_OFFSET_FILL = 0x8037;
  readonly SAMPLE_ALPHA_TO_COVERAGE = 0x809e;
  readonly SAMPLE_COVERAGE = 0x80a0;

  // Errors
  readonly NO_ERROR = 0;
  readonly INVALID_ENUM = 0x0500;
  readonly INVALID_VALUE = 0x0501;
  readonly INVALID_OPERATION = 0x0502;
  readonly OUT_OF_MEMORY = 0x0505;

  // Front face
  readonly CW = 0x0900;
  readonly CCW = 0x0901;

  // Hints
  readonly LINE_WIDTH = 0x0b21;
  readonly ALIASED_POINT_SIZE_RANGE = 0x846d;
  readonly ALIASED_LINE_WIDTH_RANGE = 0x846e;
  readonly CULL_FACE_MODE = 0x0b45;
  readonly FRONT_FACE = 0x0b46;
  readonly DEPTH_RANGE = 0x0b70;
  readonly DEPTH_WRITEMASK = 0x0b72;
  readonly DEPTH_CLEAR_VALUE = 0x0b73;
  readonly DEPTH_FUNC = 0x0b74;
  readonly STENCIL_CLEAR_VALUE = 0x0b91;
  readonly STENCIL_FUNC = 0x0b92;
  readonly STENCIL_FAIL = 0x0b94;
  readonly STENCIL_PASS_DEPTH_FAIL = 0x0b95;
  readonly STENCIL_PASS_DEPTH_PASS = 0x0b96;
  readonly STENCIL_REF = 0x0b97;
  readonly STENCIL_VALUE_MASK = 0x0b93;
  readonly STENCIL_WRITEMASK = 0x0b98;
  readonly STENCIL_BACK_FUNC = 0x8800;
  readonly STENCIL_BACK_FAIL = 0x8801;
  readonly STENCIL_BACK_PASS_DEPTH_FAIL = 0x8802;
  readonly STENCIL_BACK_PASS_DEPTH_PASS = 0x8803;
  readonly STENCIL_BACK_REF = 0x8ca3;
  readonly STENCIL_BACK_VALUE_MASK = 0x8ca4;
  readonly STENCIL_BACK_WRITEMASK = 0x8ca5;
  readonly VIEWPORT = 0x0ba2;
  readonly SCISSOR_BOX = 0x0c10;
  readonly COLOR_CLEAR_VALUE = 0x0c22;
  readonly COLOR_WRITEMASK = 0x0c23;
  readonly UNPACK_ALIGNMENT = 0x0cf5;
  readonly PACK_ALIGNMENT = 0x0d05;
  readonly MAX_TEXTURE_SIZE = 0x0d33;
  readonly MAX_VIEWPORT_DIMS = 0x0d3a;
  readonly SUBPIXEL_BITS = 0x0d50;
  readonly RED_BITS = 0x0d52;
  readonly GREEN_BITS = 0x0d53;
  readonly BLUE_BITS = 0x0d54;
  readonly ALPHA_BITS = 0x0d55;
  readonly DEPTH_BITS = 0x0d56;
  readonly STENCIL_BITS = 0x0d57;
  readonly POLYGON_OFFSET_UNITS = 0x2a00;
  readonly POLYGON_OFFSET_FACTOR = 0x8038;
  readonly TEXTURE_BINDING_2D = 0x8069;
  readonly SAMPLE_BUFFERS = 0x80a8;
  readonly SAMPLES = 0x80a9;
  readonly SAMPLE_COVERAGE_VALUE = 0x80aa;
  readonly SAMPLE_COVERAGE_INVERT = 0x80ab;

  // Compressed texture formats
  readonly COMPRESSED_TEXTURE_FORMATS = 0x86a3;

  // Hints
  readonly DONT_CARE = 0x1100;
  readonly FASTEST = 0x1101;
  readonly NICEST = 0x1102;
  readonly GENERATE_MIPMAP_HINT = 0x8192;

  // Data types
  readonly BYTE = 0x1400;
  readonly UNSIGNED_BYTE = 0x1401;
  readonly SHORT = 0x1402;
  readonly UNSIGNED_SHORT = 0x1403;
  readonly INT = 0x1404;
  readonly UNSIGNED_INT = 0x1405;
  readonly FLOAT = 0x1406;
  readonly HALF_FLOAT = 0x140b;

  // Pixel formats
  readonly DEPTH_COMPONENT = 0x1902;
  readonly ALPHA = 0x1906;
  readonly RGB = 0x1907;
  readonly RGBA = 0x1908;
  readonly LUMINANCE = 0x1909;
  readonly LUMINANCE_ALPHA = 0x190a;

  // Pixel types
  readonly UNSIGNED_SHORT_4_4_4_4 = 0x8033;
  readonly UNSIGNED_SHORT_5_5_5_1 = 0x8034;
  readonly UNSIGNED_SHORT_5_6_5 = 0x8363;

  // Shaders
  readonly FRAGMENT_SHADER = 0x8b30;
  readonly VERTEX_SHADER = 0x8b31;
  readonly MAX_VERTEX_ATTRIBS = 0x8869;
  readonly MAX_VERTEX_UNIFORM_VECTORS = 0x8dfb;
  readonly MAX_VARYING_VECTORS = 0x8dfc;
  readonly MAX_COMBINED_TEXTURE_IMAGE_UNITS = 0x8b4d;
  readonly MAX_VERTEX_TEXTURE_IMAGE_UNITS = 0x8b4c;
  readonly MAX_TEXTURE_IMAGE_UNITS = 0x8872;
  readonly MAX_FRAGMENT_UNIFORM_VECTORS = 0x8dfd;
  readonly SHADER_TYPE = 0x8b4f;
  readonly DELETE_STATUS = 0x8b80;
  readonly LINK_STATUS = 0x8b82;
  readonly VALIDATE_STATUS = 0x8b83;
  readonly ATTACHED_SHADERS = 0x8b85;
  readonly ACTIVE_UNIFORMS = 0x8b86;
  readonly ACTIVE_ATTRIBUTES = 0x8b89;
  readonly SHADING_LANGUAGE_VERSION = 0x8b8c;
  readonly CURRENT_PROGRAM = 0x8b8d;

  // Stencil
  readonly NEVER = 0x0200;
  readonly LESS = 0x0201;
  readonly EQUAL = 0x0202;
  readonly LEQUAL = 0x0203;
  readonly GREATER = 0x0204;
  readonly NOTEQUAL = 0x0205;
  readonly GEQUAL = 0x0206;
  readonly ALWAYS = 0x0207;
  readonly KEEP = 0x1e00;
  readonly REPLACE = 0x1e01;
  readonly INCR = 0x1e02;
  readonly DECR = 0x1e03;
  readonly INVERT = 0x150a;
  readonly INCR_WRAP = 0x8507;
  readonly DECR_WRAP = 0x8508;

  // Textures
  readonly VENDOR = 0x1f00;
  readonly RENDERER = 0x1f01;
  readonly VERSION = 0x1f02;
  readonly NEAREST = 0x2600;
  readonly LINEAR = 0x2601;
  readonly NEAREST_MIPMAP_NEAREST = 0x2700;
  readonly LINEAR_MIPMAP_NEAREST = 0x2701;
  readonly NEAREST_MIPMAP_LINEAR = 0x2702;
  readonly LINEAR_MIPMAP_LINEAR = 0x2703;
  readonly TEXTURE_MAG_FILTER = 0x2800;
  readonly TEXTURE_MIN_FILTER = 0x2801;
  readonly TEXTURE_WRAP_S = 0x2802;
  readonly TEXTURE_WRAP_T = 0x2803;
  readonly TEXTURE_2D = 0x0de1;
  readonly TEXTURE = 0x1702;
  readonly TEXTURE_CUBE_MAP = 0x8513;
  readonly TEXTURE_BINDING_CUBE_MAP = 0x8514;
  readonly TEXTURE_CUBE_MAP_POSITIVE_X = 0x8515;
  readonly TEXTURE_CUBE_MAP_NEGATIVE_X = 0x8516;
  readonly TEXTURE_CUBE_MAP_POSITIVE_Y = 0x8517;
  readonly TEXTURE_CUBE_MAP_NEGATIVE_Y = 0x8518;
  readonly TEXTURE_CUBE_MAP_POSITIVE_Z = 0x8519;
  readonly TEXTURE_CUBE_MAP_NEGATIVE_Z = 0x851a;
  readonly MAX_CUBE_MAP_TEXTURE_SIZE = 0x851c;
  readonly TEXTURE0 = 0x84c0;
  readonly TEXTURE1 = 0x84c1;
  readonly TEXTURE2 = 0x84c2;
  readonly TEXTURE3 = 0x84c3;
  readonly TEXTURE4 = 0x84c4;
  readonly TEXTURE5 = 0x84c5;
  readonly TEXTURE6 = 0x84c6;
  readonly TEXTURE7 = 0x84c7;
  readonly TEXTURE8 = 0x84c8;
  readonly TEXTURE9 = 0x84c9;
  readonly TEXTURE10 = 0x84ca;
  readonly TEXTURE11 = 0x84cb;
  readonly TEXTURE12 = 0x84cc;
  readonly TEXTURE13 = 0x84cd;
  readonly TEXTURE14 = 0x84ce;
  readonly TEXTURE15 = 0x84cf;
  readonly TEXTURE16 = 0x84d0;
  readonly TEXTURE17 = 0x84d1;
  readonly TEXTURE18 = 0x84d2;
  readonly TEXTURE19 = 0x84d3;
  readonly TEXTURE20 = 0x84d4;
  readonly TEXTURE21 = 0x84d5;
  readonly TEXTURE22 = 0x84d6;
  readonly TEXTURE23 = 0x84d7;
  readonly TEXTURE24 = 0x84d8;
  readonly TEXTURE25 = 0x84d9;
  readonly TEXTURE26 = 0x84da;
  readonly TEXTURE27 = 0x84db;
  readonly TEXTURE28 = 0x84dc;
  readonly TEXTURE29 = 0x84dd;
  readonly TEXTURE30 = 0x84de;
  readonly TEXTURE31 = 0x84df;
  readonly ACTIVE_TEXTURE = 0x84e0;
  readonly REPEAT = 0x2901;
  readonly CLAMP_TO_EDGE = 0x812f;
  readonly MIRRORED_REPEAT = 0x8370;

  // Uniform types
  readonly FLOAT_VEC2 = 0x8b50;
  readonly FLOAT_VEC3 = 0x8b51;
  readonly FLOAT_VEC4 = 0x8b52;
  readonly INT_VEC2 = 0x8b53;
  readonly INT_VEC3 = 0x8b54;
  readonly INT_VEC4 = 0x8b55;
  readonly BOOL = 0x8b56;
  readonly BOOL_VEC2 = 0x8b57;
  readonly BOOL_VEC3 = 0x8b58;
  readonly BOOL_VEC4 = 0x8b59;
  readonly FLOAT_MAT2 = 0x8b5a;
  readonly FLOAT_MAT3 = 0x8b5b;
  readonly FLOAT_MAT4 = 0x8b5c;
  readonly SAMPLER_2D = 0x8b5e;
  readonly SAMPLER_CUBE = 0x8b60;

  // Shader precision
  readonly LOW_FLOAT = 0x8df0;
  readonly MEDIUM_FLOAT = 0x8df1;
  readonly HIGH_FLOAT = 0x8df2;
  readonly LOW_INT = 0x8df3;
  readonly MEDIUM_INT = 0x8df4;
  readonly HIGH_INT = 0x8df5;

  // Framebuffers
  readonly FRAMEBUFFER = 0x8d40;
  readonly RENDERBUFFER = 0x8d41;
  readonly RGBA4 = 0x8056;
  readonly RGB5_A1 = 0x8057;
  readonly RGB565 = 0x8d62;
  readonly DEPTH_COMPONENT16 = 0x81a5;
  readonly STENCIL_INDEX8 = 0x8d48;
  readonly DEPTH_STENCIL = 0x84f9;
  readonly RENDERBUFFER_WIDTH = 0x8d42;
  readonly RENDERBUFFER_HEIGHT = 0x8d43;
  readonly RENDERBUFFER_INTERNAL_FORMAT = 0x8d44;
  readonly RENDERBUFFER_RED_SIZE = 0x8d50;
  readonly RENDERBUFFER_GREEN_SIZE = 0x8d51;
  readonly RENDERBUFFER_BLUE_SIZE = 0x8d52;
  readonly RENDERBUFFER_ALPHA_SIZE = 0x8d53;
  readonly RENDERBUFFER_DEPTH_SIZE = 0x8d54;
  readonly RENDERBUFFER_STENCIL_SIZE = 0x8d55;
  readonly FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE = 0x8cd0;
  readonly FRAMEBUFFER_ATTACHMENT_OBJECT_NAME = 0x8cd1;
  readonly FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL = 0x8cd2;
  readonly FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE = 0x8cd3;
  readonly COLOR_ATTACHMENT0 = 0x8ce0;
  readonly DEPTH_ATTACHMENT = 0x8d00;
  readonly STENCIL_ATTACHMENT = 0x8d20;
  readonly DEPTH_STENCIL_ATTACHMENT = 0x821a;
  readonly NONE = 0;
  readonly FRAMEBUFFER_COMPLETE = 0x8cd5;
  readonly FRAMEBUFFER_INCOMPLETE_ATTACHMENT = 0x8cd6;
  readonly FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT = 0x8cd7;
  readonly FRAMEBUFFER_INCOMPLETE_DIMENSIONS = 0x8cd9;
  readonly FRAMEBUFFER_UNSUPPORTED = 0x8cdd;
  readonly FRAMEBUFFER_BINDING = 0x8ca6;
  readonly RENDERBUFFER_BINDING = 0x8ca7;
  readonly MAX_RENDERBUFFER_SIZE = 0x84e8;
  readonly INVALID_FRAMEBUFFER_OPERATION = 0x0506;

  // Pixel storage
  readonly UNPACK_FLIP_Y_WEBGL = 0x9240;
  readonly UNPACK_PREMULTIPLY_ALPHA_WEBGL = 0x9241;
  readonly CONTEXT_LOST_WEBGL = 0x9242;
  readonly UNPACK_COLORSPACE_CONVERSION_WEBGL = 0x9243;
  readonly BROWSER_DEFAULT_WEBGL = 0x9244;

  // Shader compile status
  readonly COMPILE_STATUS = 0x8b81;
  readonly INFO_LOG_LENGTH = 0x8b84;
  readonly SHADER_SOURCE_LENGTH = 0x8b88;
  readonly ACTIVE_UNIFORM_MAX_LENGTH = 0x8b87;

  // ============================================================
  // WebGL2 Constants
  // ============================================================

  readonly READ_BUFFER = 0x0c02;
  readonly UNPACK_ROW_LENGTH = 0x0cf2;
  readonly UNPACK_SKIP_ROWS = 0x0cf3;
  readonly UNPACK_SKIP_PIXELS = 0x0cf4;
  readonly PACK_ROW_LENGTH = 0x0d02;
  readonly PACK_SKIP_ROWS = 0x0d03;
  readonly PACK_SKIP_PIXELS = 0x0d04;
  readonly COLOR = 0x1800;
  readonly DEPTH = 0x1801;
  readonly STENCIL = 0x1802;
  readonly RED = 0x1903;
  readonly RGB8 = 0x8051;
  readonly RGBA8 = 0x8058;
  readonly RGB10_A2 = 0x8059;
  readonly TEXTURE_BINDING_3D = 0x806a;
  readonly UNPACK_SKIP_IMAGES = 0x806d;
  readonly UNPACK_IMAGE_HEIGHT = 0x806e;
  readonly TEXTURE_3D = 0x806f;
  readonly TEXTURE_WRAP_R = 0x8072;
  readonly MAX_3D_TEXTURE_SIZE = 0x8073;
  readonly UNSIGNED_INT_2_10_10_10_REV = 0x8368;
  readonly MAX_ELEMENTS_VERTICES = 0x80e8;
  readonly MAX_ELEMENTS_INDICES = 0x80e9;
  readonly TEXTURE_MIN_LOD = 0x813a;
  readonly TEXTURE_MAX_LOD = 0x813b;
  readonly TEXTURE_BASE_LEVEL = 0x813c;
  readonly TEXTURE_MAX_LEVEL = 0x813d;
  readonly MIN = 0x8007;
  readonly MAX = 0x8008;
  readonly DEPTH_COMPONENT24 = 0x81a6;
  readonly MAX_TEXTURE_LOD_BIAS = 0x84fd;
  readonly TEXTURE_COMPARE_MODE = 0x884c;
  readonly TEXTURE_COMPARE_FUNC = 0x884d;
  readonly CURRENT_QUERY = 0x8865;
  readonly QUERY_RESULT = 0x8866;
  readonly QUERY_RESULT_AVAILABLE = 0x8867;
  readonly STREAM_READ = 0x88e1;
  readonly STREAM_COPY = 0x88e2;
  readonly STATIC_READ = 0x88e5;
  readonly STATIC_COPY = 0x88e6;
  readonly DYNAMIC_READ = 0x88e9;
  readonly DYNAMIC_COPY = 0x88ea;
  readonly MAX_DRAW_BUFFERS = 0x8824;
  readonly DRAW_BUFFER0 = 0x8825;
  readonly DRAW_BUFFER1 = 0x8826;
  readonly DRAW_BUFFER2 = 0x8827;
  readonly DRAW_BUFFER3 = 0x8828;
  readonly DRAW_BUFFER4 = 0x8829;
  readonly DRAW_BUFFER5 = 0x882a;
  readonly DRAW_BUFFER6 = 0x882b;
  readonly DRAW_BUFFER7 = 0x882c;
  readonly DRAW_BUFFER8 = 0x882d;
  readonly DRAW_BUFFER9 = 0x882e;
  readonly DRAW_BUFFER10 = 0x882f;
  readonly DRAW_BUFFER11 = 0x8830;
  readonly DRAW_BUFFER12 = 0x8831;
  readonly DRAW_BUFFER13 = 0x8832;
  readonly DRAW_BUFFER14 = 0x8833;
  readonly DRAW_BUFFER15 = 0x8834;
  readonly MAX_FRAGMENT_UNIFORM_COMPONENTS = 0x8b49;
  readonly MAX_VERTEX_UNIFORM_COMPONENTS = 0x8b4a;
  readonly SAMPLER_3D = 0x8b5f;
  readonly SAMPLER_2D_SHADOW = 0x8b62;
  readonly FRAGMENT_SHADER_DERIVATIVE_HINT = 0x8b8b;
  readonly PIXEL_PACK_BUFFER = 0x88eb;
  readonly PIXEL_UNPACK_BUFFER = 0x88ec;
  readonly PIXEL_PACK_BUFFER_BINDING = 0x88ed;
  readonly PIXEL_UNPACK_BUFFER_BINDING = 0x88ef;
  readonly FLOAT_MAT2x3 = 0x8b65;
  readonly FLOAT_MAT2x4 = 0x8b66;
  readonly FLOAT_MAT3x2 = 0x8b67;
  readonly FLOAT_MAT3x4 = 0x8b68;
  readonly FLOAT_MAT4x2 = 0x8b69;
  readonly FLOAT_MAT4x3 = 0x8b6a;
  readonly SRGB = 0x8c40;
  readonly SRGB8 = 0x8c41;
  readonly SRGB8_ALPHA8 = 0x8c43;
  readonly COMPARE_REF_TO_TEXTURE = 0x884e;
  readonly RGBA32F = 0x8814;
  readonly RGB32F = 0x8815;
  readonly RGBA16F = 0x881a;
  readonly RGB16F = 0x881b;
  readonly VERTEX_ATTRIB_ARRAY_INTEGER = 0x88fd;
  readonly MAX_ARRAY_TEXTURE_LAYERS = 0x88ff;
  readonly MIN_PROGRAM_TEXEL_OFFSET = 0x8904;
  readonly MAX_PROGRAM_TEXEL_OFFSET = 0x8905;
  readonly MAX_VARYING_COMPONENTS = 0x8b4b;
  readonly TEXTURE_2D_ARRAY = 0x8c1a;
  readonly TEXTURE_BINDING_2D_ARRAY = 0x8c1d;
  readonly R11F_G11F_B10F = 0x8c3a;
  readonly UNSIGNED_INT_10F_11F_11F_REV = 0x8c3b;
  readonly RGB9_E5 = 0x8c3d;
  readonly UNSIGNED_INT_5_9_9_9_REV = 0x8c3e;
  readonly TRANSFORM_FEEDBACK_BUFFER_MODE = 0x8c7f;
  readonly MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS = 0x8c80;
  readonly TRANSFORM_FEEDBACK_VARYINGS = 0x8c83;
  readonly TRANSFORM_FEEDBACK_BUFFER_START = 0x8c84;
  readonly TRANSFORM_FEEDBACK_BUFFER_SIZE = 0x8c85;
  readonly TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN = 0x8c88;
  readonly RASTERIZER_DISCARD = 0x8c89;
  readonly MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS = 0x8c8a;
  readonly MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS = 0x8c8b;
  readonly INTERLEAVED_ATTRIBS = 0x8c8c;
  readonly SEPARATE_ATTRIBS = 0x8c8d;
  readonly TRANSFORM_FEEDBACK_BUFFER = 0x8c8e;
  readonly TRANSFORM_FEEDBACK_BUFFER_BINDING = 0x8c8f;
  readonly RGBA32UI = 0x8d70;
  readonly RGB32UI = 0x8d71;
  readonly RGBA16UI = 0x8d76;
  readonly RGB16UI = 0x8d77;
  readonly RGBA8UI = 0x8d7c;
  readonly RGB8UI = 0x8d7d;
  readonly RGBA32I = 0x8d82;
  readonly RGB32I = 0x8d83;
  readonly RGBA16I = 0x8d88;
  readonly RGB16I = 0x8d89;
  readonly RGBA8I = 0x8d8e;
  readonly RGB8I = 0x8d8f;
  readonly RED_INTEGER = 0x8d94;
  readonly RGB_INTEGER = 0x8d98;
  readonly RGBA_INTEGER = 0x8d99;
  readonly SAMPLER_2D_ARRAY = 0x8dc1;
  readonly SAMPLER_2D_ARRAY_SHADOW = 0x8dc4;
  readonly SAMPLER_CUBE_SHADOW = 0x8dc5;
  readonly UNSIGNED_INT_VEC2 = 0x8dc6;
  readonly UNSIGNED_INT_VEC3 = 0x8dc7;
  readonly UNSIGNED_INT_VEC4 = 0x8dc8;
  readonly INT_SAMPLER_2D = 0x8dca;
  readonly INT_SAMPLER_3D = 0x8dcb;
  readonly INT_SAMPLER_CUBE = 0x8dcc;
  readonly INT_SAMPLER_2D_ARRAY = 0x8dcf;
  readonly UNSIGNED_INT_SAMPLER_2D = 0x8dd2;
  readonly UNSIGNED_INT_SAMPLER_3D = 0x8dd3;
  readonly UNSIGNED_INT_SAMPLER_CUBE = 0x8dd4;
  readonly UNSIGNED_INT_SAMPLER_2D_ARRAY = 0x8dd7;
  readonly DEPTH_COMPONENT32F = 0x8cac;
  readonly DEPTH32F_STENCIL8 = 0x8cad;
  readonly FLOAT_32_UNSIGNED_INT_24_8_REV = 0x8dad;
  readonly FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING = 0x8210;
  readonly FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE = 0x8211;
  readonly FRAMEBUFFER_ATTACHMENT_RED_SIZE = 0x8212;
  readonly FRAMEBUFFER_ATTACHMENT_GREEN_SIZE = 0x8213;
  readonly FRAMEBUFFER_ATTACHMENT_BLUE_SIZE = 0x8214;
  readonly FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE = 0x8215;
  readonly FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE = 0x8216;
  readonly FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE = 0x8217;
  readonly FRAMEBUFFER_DEFAULT = 0x8218;
  readonly UNSIGNED_INT_24_8 = 0x84fa;
  readonly DEPTH24_STENCIL8 = 0x88f0;
  readonly UNSIGNED_NORMALIZED = 0x8c17;
  readonly DRAW_FRAMEBUFFER_BINDING = 0x8ca6;
  readonly READ_FRAMEBUFFER = 0x8ca8;
  readonly DRAW_FRAMEBUFFER = 0x8ca9;
  readonly READ_FRAMEBUFFER_BINDING = 0x8caa;
  readonly RENDERBUFFER_SAMPLES = 0x8cab;
  readonly FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER = 0x8cd4;
  readonly MAX_COLOR_ATTACHMENTS = 0x8cdf;
  readonly COLOR_ATTACHMENT1 = 0x8ce1;
  readonly COLOR_ATTACHMENT2 = 0x8ce2;
  readonly COLOR_ATTACHMENT3 = 0x8ce3;
  readonly COLOR_ATTACHMENT4 = 0x8ce4;
  readonly COLOR_ATTACHMENT5 = 0x8ce5;
  readonly COLOR_ATTACHMENT6 = 0x8ce6;
  readonly COLOR_ATTACHMENT7 = 0x8ce7;
  readonly COLOR_ATTACHMENT8 = 0x8ce8;
  readonly COLOR_ATTACHMENT9 = 0x8ce9;
  readonly COLOR_ATTACHMENT10 = 0x8cea;
  readonly COLOR_ATTACHMENT11 = 0x8ceb;
  readonly COLOR_ATTACHMENT12 = 0x8cec;
  readonly COLOR_ATTACHMENT13 = 0x8ced;
  readonly COLOR_ATTACHMENT14 = 0x8cee;
  readonly COLOR_ATTACHMENT15 = 0x8cef;
  readonly FRAMEBUFFER_INCOMPLETE_MULTISAMPLE = 0x8d56;
  readonly MAX_SAMPLES = 0x8d57;
  readonly HALF_FLOAT_OES = 0x8d61;
  readonly RG = 0x8227;
  readonly RG_INTEGER = 0x8228;
  readonly R8 = 0x8229;
  readonly RG8 = 0x822b;
  readonly R16F = 0x822d;
  readonly R32F = 0x822e;
  readonly RG16F = 0x822f;
  readonly RG32F = 0x8230;
  readonly R8I = 0x8231;
  readonly R8UI = 0x8232;
  readonly R16I = 0x8233;
  readonly R16UI = 0x8234;
  readonly R32I = 0x8235;
  readonly R32UI = 0x8236;
  readonly RG8I = 0x8237;
  readonly RG8UI = 0x8238;
  readonly RG16I = 0x8239;
  readonly RG16UI = 0x823a;
  readonly RG32I = 0x823b;
  readonly RG32UI = 0x823c;
  readonly VERTEX_ARRAY_BINDING = 0x85b5;
  readonly R8_SNORM = 0x8f94;
  readonly RG8_SNORM = 0x8f95;
  readonly RGB8_SNORM = 0x8f96;
  readonly RGBA8_SNORM = 0x8f97;
  readonly SIGNED_NORMALIZED = 0x8f9c;
  readonly COPY_READ_BUFFER = 0x8f36;
  readonly COPY_WRITE_BUFFER = 0x8f37;
  readonly COPY_READ_BUFFER_BINDING = 0x8f36;
  readonly COPY_WRITE_BUFFER_BINDING = 0x8f37;
  readonly UNIFORM_BUFFER = 0x8a11;
  readonly UNIFORM_BUFFER_BINDING = 0x8a28;
  readonly UNIFORM_BUFFER_START = 0x8a29;
  readonly UNIFORM_BUFFER_SIZE = 0x8a2a;
  readonly MAX_VERTEX_UNIFORM_BLOCKS = 0x8a2b;
  readonly MAX_FRAGMENT_UNIFORM_BLOCKS = 0x8a2d;
  readonly MAX_COMBINED_UNIFORM_BLOCKS = 0x8a2e;
  readonly MAX_UNIFORM_BUFFER_BINDINGS = 0x8a2f;
  readonly MAX_UNIFORM_BLOCK_SIZE = 0x8a30;
  readonly MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS = 0x8a31;
  readonly MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS = 0x8a33;
  readonly UNIFORM_BUFFER_OFFSET_ALIGNMENT = 0x8a34;
  readonly ACTIVE_UNIFORM_BLOCKS = 0x8a36;
  readonly UNIFORM_TYPE = 0x8a37;
  readonly UNIFORM_SIZE = 0x8a38;
  readonly UNIFORM_BLOCK_INDEX = 0x8a3a;
  readonly UNIFORM_OFFSET = 0x8a3b;
  readonly UNIFORM_ARRAY_STRIDE = 0x8a3c;
  readonly UNIFORM_MATRIX_STRIDE = 0x8a3d;
  readonly UNIFORM_IS_ROW_MAJOR = 0x8a3e;
  readonly UNIFORM_BLOCK_BINDING = 0x8a3f;
  readonly UNIFORM_BLOCK_DATA_SIZE = 0x8a40;
  readonly UNIFORM_BLOCK_ACTIVE_UNIFORMS = 0x8a42;
  readonly UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES = 0x8a43;
  readonly UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER = 0x8a44;
  readonly UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER = 0x8a46;
  readonly INVALID_INDEX = 0xffffffff;
  readonly MAX_VERTEX_OUTPUT_COMPONENTS = 0x9122;
  readonly MAX_FRAGMENT_INPUT_COMPONENTS = 0x9125;
  readonly MAX_SERVER_WAIT_TIMEOUT = 0x9111;
  readonly OBJECT_TYPE = 0x9112;
  readonly SYNC_CONDITION = 0x9113;
  readonly SYNC_STATUS = 0x9114;
  readonly SYNC_FLAGS = 0x9115;
  readonly SYNC_FENCE = 0x9116;
  readonly SYNC_GPU_COMMANDS_COMPLETE = 0x9117;
  readonly UNSIGNALED = 0x9118;
  readonly SIGNALED = 0x9119;
  readonly ALREADY_SIGNALED = 0x911a;
  readonly TIMEOUT_EXPIRED = 0x911b;
  readonly CONDITION_SATISFIED = 0x911c;
  readonly WAIT_FAILED = 0x911d;
  readonly SYNC_FLUSH_COMMANDS_BIT = 0x00000001;
  readonly VERTEX_ATTRIB_ARRAY_DIVISOR = 0x88fe;
  readonly ANY_SAMPLES_PASSED = 0x8c2f;
  readonly ANY_SAMPLES_PASSED_CONSERVATIVE = 0x8d6a;
  readonly SAMPLER_BINDING = 0x8919;
  readonly RGB10_A2UI = 0x906f;
  readonly INT_2_10_10_10_REV = 0x8d9f;
  readonly TRANSFORM_FEEDBACK = 0x8e22;
  readonly TRANSFORM_FEEDBACK_PAUSED = 0x8e23;
  readonly TRANSFORM_FEEDBACK_ACTIVE = 0x8e24;
  readonly TRANSFORM_FEEDBACK_BINDING = 0x8e25;
  readonly TEXTURE_IMMUTABLE_FORMAT = 0x912f;
  readonly MAX_ELEMENT_INDEX = 0x8d6b;
  readonly TEXTURE_IMMUTABLE_LEVELS = 0x82df;
  readonly TIMEOUT_IGNORED = -1;
  readonly MAX_CLIENT_WAIT_TIMEOUT_WEBGL = 0x9247;

  // ============================================================
  // WebGL1 Methods
  // ============================================================

  getContextAttributes(): WebGLContextAttributes | null {
    return {
      alpha: true,
      antialias: false,
      depth: true,
      failIfMajorPerformanceCaveat: false,
      powerPreference: "default",
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      stencil: false,
      desynchronized: false,
    };
  }

  isContextLost(): boolean {
    return false;
  }

  getSupportedExtensions(): string[] | null {
    return [];
  }

  getExtension(_name: string): unknown {
    return null;
  }

  activeTexture(texture: GLenum): void {
    lib.symbols.glActiveTexture(texture);
  }

  attachShader(program: WebGLProgram | null, shader: WebGLShader | null): void {
    if (!program || !shader) return;
    lib.symbols.glAttachShader(getHandle(program), getHandle(shader));
  }

  bindAttribLocation(program: WebGLProgram | null, index: GLuint, name: string): void {
    if (!program) return;
    const nameBuffer = Buffer.from(name + "\0");
    lib.symbols.glBindAttribLocation(getHandle(program), index, ptr(nameBuffer));
  }

  bindBuffer(target: GLenum, buffer: WebGLBuffer | null): void {
    lib.symbols.glBindBuffer(target, getHandle(buffer));
  }

  bindFramebuffer(target: GLenum, framebuffer: WebGLFramebuffer | null): void {
    lib.symbols.glBindFramebuffer(target, getHandle(framebuffer));
  }

  bindRenderbuffer(target: GLenum, renderbuffer: WebGLRenderbuffer | null): void {
    lib.symbols.glBindRenderbuffer(target, getHandle(renderbuffer));
  }

  bindTexture(target: GLenum, texture: WebGLTexture | null): void {
    lib.symbols.glBindTexture(target, getHandle(texture));
  }

  blendColor(red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf): void {
    lib.symbols.glBlendColor(red, green, blue, alpha);
  }

  blendEquation(mode: GLenum): void {
    lib.symbols.glBlendEquation(mode);
  }

  blendEquationSeparate(modeRGB: GLenum, modeAlpha: GLenum): void {
    lib.symbols.glBlendEquationSeparate(modeRGB, modeAlpha);
  }

  blendFunc(sfactor: GLenum, dfactor: GLenum): void {
    lib.symbols.glBlendFunc(sfactor, dfactor);
  }

  blendFuncSeparate(srcRGB: GLenum, dstRGB: GLenum, srcAlpha: GLenum, dstAlpha: GLenum): void {
    lib.symbols.glBlendFuncSeparate(srcRGB, dstRGB, srcAlpha, dstAlpha);
  }

  bufferData(target: GLenum, sizeOrData: GLsizeiptr | BufferSource | null, usage: GLenum): void {
    if (sizeOrData === null) {
      lib.symbols.glBufferData(target, BigInt(0), null, usage);
    } else if (typeof sizeOrData === "number") {
      lib.symbols.glBufferData(target, BigInt(sizeOrData), null, usage);
    } else {
      const data =
        sizeOrData instanceof ArrayBuffer
          ? new Uint8Array(sizeOrData)
          : new Uint8Array(sizeOrData.buffer, sizeOrData.byteOffset, sizeOrData.byteLength);
      lib.symbols.glBufferData(target, BigInt(data.byteLength), ptr(data), usage);
    }
  }

  bufferSubData(target: GLenum, offset: GLintptr, data: BufferSource): void {
    const bytes =
      data instanceof ArrayBuffer
        ? new Uint8Array(data)
        : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    lib.symbols.glBufferSubData(target, BigInt(offset), BigInt(bytes.byteLength), ptr(bytes));
  }

  checkFramebufferStatus(target: GLenum): GLenum {
    return lib.symbols.glCheckFramebufferStatus(target);
  }

  clear(mask: GLbitfield): void {
    lib.symbols.glClear(mask);
  }

  clearColor(red: GLclampf, green: GLclampf, blue: GLclampf, alpha: GLclampf): void {
    lib.symbols.glClearColor(red, green, blue, alpha);
  }

  clearDepth(depth: GLclampf): void {
    lib.symbols.glClearDepth(depth);
  }

  clearStencil(s: GLint): void {
    lib.symbols.glClearStencil(s);
  }

  colorMask(red: GLboolean, green: GLboolean, blue: GLboolean, alpha: GLboolean): void {
    lib.symbols.glColorMask(red ? 1 : 0, green ? 1 : 0, blue ? 1 : 0, alpha ? 1 : 0);
  }

  compileShader(shader: WebGLShader | null): void {
    if (!shader) return;
    lib.symbols.glCompileShader(getHandle(shader));
  }

  compressedTexImage2D(
    target: GLenum,
    level: GLint,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei,
    border: GLint,
    data: ArrayBufferView
  ): void {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    lib.symbols.glCompressedTexImage2D(
      target,
      level,
      internalformat,
      width,
      height,
      border,
      bytes.byteLength,
      ptr(bytes)
    );
  }

  compressedTexSubImage2D(
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    width: GLsizei,
    height: GLsizei,
    format: GLenum,
    data: ArrayBufferView
  ): void {
    const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    lib.symbols.glCompressedTexSubImage2D(
      target,
      level,
      xoffset,
      yoffset,
      width,
      height,
      format,
      bytes.byteLength,
      ptr(bytes)
    );
  }

  copyTexImage2D(
    target: GLenum,
    level: GLint,
    internalformat: GLenum,
    x: GLint,
    y: GLint,
    width: GLsizei,
    height: GLsizei,
    border: GLint
  ): void {
    lib.symbols.glCopyTexImage2D(target, level, internalformat, x, y, width, height, border);
  }

  copyTexSubImage2D(
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    x: GLint,
    y: GLint,
    width: GLsizei,
    height: GLsizei
  ): void {
    lib.symbols.glCopyTexSubImage2D(target, level, xoffset, yoffset, x, y, width, height);
  }

  createBuffer(): WebGLBuffer | null {
    const buffers = new Uint32Array(1);
    lib.symbols.glGenBuffers(1, ptr(buffers));
    const handle = buffers[0]!;
    return handle ? new DarwinWebGLBuffer(handle) : null;
  }

  createFramebuffer(): WebGLFramebuffer | null {
    const framebuffers = new Uint32Array(1);
    lib.symbols.glGenFramebuffers(1, ptr(framebuffers));
    const handle = framebuffers[0]!;
    return handle ? new DarwinWebGLFramebuffer(handle) : null;
  }

  createProgram(): WebGLProgram | null {
    const handle = lib.symbols.glCreateProgram();
    return handle ? new DarwinWebGLProgram(handle) : null;
  }

  createRenderbuffer(): WebGLRenderbuffer | null {
    const renderbuffers = new Uint32Array(1);
    lib.symbols.glGenRenderbuffers(1, ptr(renderbuffers));
    const handle = renderbuffers[0]!;
    return handle ? new DarwinWebGLRenderbuffer(handle) : null;
  }

  createShader(type: GLenum): WebGLShader | null {
    const handle = lib.symbols.glCreateShader(type);
    return handle ? new DarwinWebGLShader(handle) : null;
  }

  createTexture(): WebGLTexture | null {
    const textures = new Uint32Array(1);
    lib.symbols.glGenTextures(1, ptr(textures));
    const handle = textures[0]!;
    return handle ? new DarwinWebGLTexture(handle) : null;
  }

  cullFace(mode: GLenum): void {
    lib.symbols.glCullFace(mode);
  }

  deleteBuffer(buffer: WebGLBuffer | null): void {
    if (!buffer) return;
    const handle = getHandle(buffer);
    const buffers = new Uint32Array([handle]);
    lib.symbols.glDeleteBuffers(1, ptr(buffers));
  }

  deleteFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    if (!framebuffer) return;
    const handle = getHandle(framebuffer);
    const framebuffers = new Uint32Array([handle]);
    lib.symbols.glDeleteFramebuffers(1, ptr(framebuffers));
  }

  deleteProgram(program: WebGLProgram | null): void {
    if (!program) return;
    lib.symbols.glDeleteProgram(getHandle(program));
  }

  deleteRenderbuffer(renderbuffer: WebGLRenderbuffer | null): void {
    if (!renderbuffer) return;
    const handle = getHandle(renderbuffer);
    const renderbuffers = new Uint32Array([handle]);
    lib.symbols.glDeleteRenderbuffers(1, ptr(renderbuffers));
  }

  deleteShader(shader: WebGLShader | null): void {
    if (!shader) return;
    lib.symbols.glDeleteShader(getHandle(shader));
  }

  deleteTexture(texture: WebGLTexture | null): void {
    if (!texture) return;
    const handle = getHandle(texture);
    const textures = new Uint32Array([handle]);
    lib.symbols.glDeleteTextures(1, ptr(textures));
  }

  depthFunc(func: GLenum): void {
    lib.symbols.glDepthFunc(func);
  }

  depthMask(flag: GLboolean): void {
    lib.symbols.glDepthMask(flag ? 1 : 0);
  }

  depthRange(zNear: GLclampf, zFar: GLclampf): void {
    lib.symbols.glDepthRange(zNear, zFar);
  }

  detachShader(program: WebGLProgram | null, shader: WebGLShader | null): void {
    if (!program || !shader) return;
    lib.symbols.glDetachShader(getHandle(program), getHandle(shader));
  }

  disable(cap: GLenum): void {
    lib.symbols.glDisable(cap);
  }

  disableVertexAttribArray(index: GLuint): void {
    lib.symbols.glDisableVertexAttribArray(index);
  }

  drawArrays(mode: GLenum, first: GLint, count: GLsizei): void {
    lib.symbols.glDrawArrays(mode, first, count);
  }

  drawElements(mode: GLenum, count: GLsizei, type: GLenum, offset: GLintptr): void {
    lib.symbols.glDrawElements(mode, count, type, offset as unknown as ReturnType<typeof ptr>);
  }

  enable(cap: GLenum): void {
    lib.symbols.glEnable(cap);
  }

  enableVertexAttribArray(index: GLuint): void {
    lib.symbols.glEnableVertexAttribArray(index);
  }

  finish(): void {
    lib.symbols.glFinish();
  }

  flush(): void {
    lib.symbols.glFlush();
  }

  framebufferRenderbuffer(
    target: GLenum,
    attachment: GLenum,
    renderbuffertarget: GLenum,
    renderbuffer: WebGLRenderbuffer | null
  ): void {
    lib.symbols.glFramebufferRenderbuffer(
      target,
      attachment,
      renderbuffertarget,
      getHandle(renderbuffer)
    );
  }

  framebufferTexture2D(
    target: GLenum,
    attachment: GLenum,
    textarget: GLenum,
    texture: WebGLTexture | null,
    level: GLint
  ): void {
    lib.symbols.glFramebufferTexture2D(target, attachment, textarget, getHandle(texture), level);
  }

  frontFace(mode: GLenum): void {
    lib.symbols.glFrontFace(mode);
  }

  generateMipmap(target: GLenum): void {
    lib.symbols.glGenerateMipmap(target);
  }

  getActiveAttrib(program: WebGLProgram | null, index: GLuint): WebGLActiveInfo | null {
    if (!program) return null;
    const length = new Int32Array(1);
    const size = new Int32Array(1);
    const type = new Uint32Array(1);
    const nameBuffer = Buffer.alloc(256);
    lib.symbols.glGetActiveAttrib(
      getHandle(program),
      index,
      256,
      ptr(length),
      ptr(size),
      ptr(type),
      ptr(nameBuffer)
    );
    const name = nameBuffer.toString("utf8", 0, length[0]!);
    return new DarwinWebGLActiveInfo(name, size[0]!, type[0]!);
  }

  getActiveUniform(program: WebGLProgram | null, index: GLuint): WebGLActiveInfo | null {
    if (!program) return null;
    const length = new Int32Array(1);
    const size = new Int32Array(1);
    const type = new Uint32Array(1);
    const nameBuffer = Buffer.alloc(256);
    lib.symbols.glGetActiveUniform(
      getHandle(program),
      index,
      256,
      ptr(length),
      ptr(size),
      ptr(type),
      ptr(nameBuffer)
    );
    const name = nameBuffer.toString("utf8", 0, length[0]!);
    return new DarwinWebGLActiveInfo(name, size[0]!, type[0]!);
  }

  getAttachedShaders(program: WebGLProgram | null): WebGLShader[] | null {
    if (!program) return null;
    const count = new Int32Array(1);
    lib.symbols.glGetProgramiv(getHandle(program), this.ATTACHED_SHADERS, ptr(count));
    const shaders = new Uint32Array(count[0]!);
    const actualCount = new Int32Array(1);
    lib.symbols.glGetAttachedShaders(getHandle(program), count[0]!, ptr(actualCount), ptr(shaders));
    return Array.from(shaders).map((h) => new DarwinWebGLShader(h));
  }

  getAttribLocation(program: WebGLProgram | null, name: string): GLint {
    if (!program) return -1;
    const nameBuffer = Buffer.from(name + "\0");
    return lib.symbols.glGetAttribLocation(getHandle(program), ptr(nameBuffer));
  }

  getBufferParameter(target: GLenum, pname: GLenum): unknown {
    const buffer = new Int32Array(1);
    lib.symbols.glGetBufferParameteriv(target, pname, ptr(buffer));
    return buffer[0];
  }

  getError(): GLenum {
    return lib.symbols.glGetError();
  }

  getFramebufferAttachmentParameter(target: GLenum, attachment: GLenum, pname: GLenum): unknown {
    const buffer = new Int32Array(1);
    lib.symbols.glGetFramebufferAttachmentParameteriv(target, attachment, pname, ptr(buffer));
    return buffer[0];
  }

  getParameter(pname: GLenum): unknown {
    switch (pname) {
      case this.VERSION:
      case this.SHADING_LANGUAGE_VERSION:
      case this.VENDOR:
      case this.RENDERER: {
        const strPtr = lib.symbols.glGetString(pname);
        if (!strPtr) return null;
        // Read null-terminated string from pointer
        const cstr = new (require("bun:ffi").CString)(strPtr);
        return cstr.toString();
      }
      default: {
        const buffer = new Int32Array(4);
        lib.symbols.glGetIntegerv(pname, ptr(buffer));
        return buffer[0];
      }
    }
  }

  getProgramInfoLog(program: WebGLProgram | null): string | null {
    if (!program) return null;
    const lengthBuffer = new Int32Array(1);
    lib.symbols.glGetProgramiv(getHandle(program), this.INFO_LOG_LENGTH, ptr(lengthBuffer));
    const length = lengthBuffer[0]!;
    if (length === 0) return "";
    const logBuffer = Buffer.alloc(length);
    const actualLengthBuffer = new Int32Array(1);
    lib.symbols.glGetProgramInfoLog(
      getHandle(program),
      length,
      ptr(actualLengthBuffer),
      ptr(logBuffer)
    );
    return logBuffer.toString("utf8", 0, actualLengthBuffer[0]!);
  }

  getProgramParameter(program: WebGLProgram | null, pname: GLenum): unknown {
    if (!program) return null;
    const buffer = new Int32Array(1);
    lib.symbols.glGetProgramiv(getHandle(program), pname, ptr(buffer));
    if (
      pname === this.DELETE_STATUS ||
      pname === this.LINK_STATUS ||
      pname === this.VALIDATE_STATUS
    ) {
      return buffer[0] !== 0;
    }
    return buffer[0];
  }

  getRenderbufferParameter(target: GLenum, pname: GLenum): unknown {
    const buffer = new Int32Array(1);
    lib.symbols.glGetRenderbufferParameteriv(target, pname, ptr(buffer));
    return buffer[0];
  }

  getShaderInfoLog(shader: WebGLShader | null): string | null {
    if (!shader) return null;
    const lengthBuffer = new Int32Array(1);
    lib.symbols.glGetShaderiv(getHandle(shader), this.INFO_LOG_LENGTH, ptr(lengthBuffer));
    const length = lengthBuffer[0]!;
    if (length === 0) return "";
    const logBuffer = Buffer.alloc(length);
    const actualLengthBuffer = new Int32Array(1);
    lib.symbols.glGetShaderInfoLog(
      getHandle(shader),
      length,
      ptr(actualLengthBuffer),
      ptr(logBuffer)
    );
    return logBuffer.toString("utf8", 0, actualLengthBuffer[0]!);
  }

  getShaderParameter(shader: WebGLShader | null, pname: GLenum): unknown {
    if (!shader) return null;
    const buffer = new Int32Array(1);
    lib.symbols.glGetShaderiv(getHandle(shader), pname, ptr(buffer));
    if (pname === this.DELETE_STATUS || pname === this.COMPILE_STATUS) {
      return buffer[0] !== 0;
    }
    return buffer[0];
  }

  getShaderPrecisionFormat(
    shadertype: GLenum,
    precisiontype: GLenum
  ): WebGLShaderPrecisionFormat | null {
    // OpenGL doesn't have direct equivalent; return reasonable defaults
    let rangeMin = 0,
      rangeMax = 0,
      precision = 0;
    switch (precisiontype) {
      case this.LOW_FLOAT:
      case this.MEDIUM_FLOAT:
      case this.HIGH_FLOAT:
        rangeMin = 127;
        rangeMax = 127;
        precision = 23;
        break;
      case this.LOW_INT:
      case this.MEDIUM_INT:
      case this.HIGH_INT:
        rangeMin = 31;
        rangeMax = 30;
        precision = 0;
        break;
    }
    return new DarwinWebGLShaderPrecisionFormat(rangeMin, rangeMax, precision);
  }

  getShaderSource(shader: WebGLShader | null): string | null {
    if (!shader) return null;
    const lengthBuffer = new Int32Array(1);
    lib.symbols.glGetShaderiv(getHandle(shader), this.SHADER_SOURCE_LENGTH, ptr(lengthBuffer));
    const length = lengthBuffer[0]!;
    if (length === 0) return "";
    const sourceBuffer = Buffer.alloc(length);
    const actualLengthBuffer = new Int32Array(1);
    lib.symbols.glGetShaderSource(
      getHandle(shader),
      length,
      ptr(actualLengthBuffer),
      ptr(sourceBuffer)
    );
    return sourceBuffer.toString("utf8", 0, actualLengthBuffer[0]!);
  }

  getTexParameter(target: GLenum, pname: GLenum): unknown {
    const buffer = new Int32Array(1);
    lib.symbols.glGetTexParameteriv(target, pname, ptr(buffer));
    return buffer[0];
  }

  getUniform(program: WebGLProgram | null, location: WebGLUniformLocation | null): unknown {
    if (!program || !location) return null;
    const buffer = new Float32Array(16);
    lib.symbols.glGetUniformfv(getHandle(program), getHandle(location), ptr(buffer));
    return buffer[0];
  }

  getUniformLocation(program: WebGLProgram | null, name: string): WebGLUniformLocation | null {
    if (!program) return null;
    const nameBuffer = Buffer.from(name + "\0");
    const location = lib.symbols.glGetUniformLocation(getHandle(program), ptr(nameBuffer));
    return location >= 0 ? new DarwinWebGLUniformLocation(location) : null;
  }

  getVertexAttrib(index: GLuint, pname: GLenum): unknown {
    const buffer = new Int32Array(4);
    lib.symbols.glGetVertexAttribiv(index, pname, ptr(buffer));
    return buffer[0];
  }

  getVertexAttribOffset(index: GLuint, pname: GLenum): GLintptr {
    const buffer = new BigUint64Array(1);
    lib.symbols.glGetVertexAttribPointerv(index, pname, ptr(buffer));
    return Number(buffer[0]);
  }

  hint(target: GLenum, mode: GLenum): void {
    lib.symbols.glHint(target, mode);
  }

  isBuffer(buffer: WebGLBuffer | null): GLboolean {
    if (!buffer) return false;
    return lib.symbols.glIsBuffer(getHandle(buffer)) !== 0;
  }

  isEnabled(cap: GLenum): GLboolean {
    return lib.symbols.glIsEnabled(cap) !== 0;
  }

  isFramebuffer(framebuffer: WebGLFramebuffer | null): GLboolean {
    if (!framebuffer) return false;
    return lib.symbols.glIsFramebuffer(getHandle(framebuffer)) !== 0;
  }

  isProgram(program: WebGLProgram | null): GLboolean {
    if (!program) return false;
    return lib.symbols.glIsProgram(getHandle(program)) !== 0;
  }

  isRenderbuffer(renderbuffer: WebGLRenderbuffer | null): GLboolean {
    if (!renderbuffer) return false;
    return lib.symbols.glIsRenderbuffer(getHandle(renderbuffer)) !== 0;
  }

  isShader(shader: WebGLShader | null): GLboolean {
    if (!shader) return false;
    return lib.symbols.glIsShader(getHandle(shader)) !== 0;
  }

  isTexture(texture: WebGLTexture | null): GLboolean {
    if (!texture) return false;
    return lib.symbols.glIsTexture(getHandle(texture)) !== 0;
  }

  lineWidth(width: GLfloat): void {
    lib.symbols.glLineWidth(width);
  }

  linkProgram(program: WebGLProgram | null): void {
    if (!program) return;
    lib.symbols.glLinkProgram(getHandle(program));
  }

  pixelStorei(pname: GLenum, param: GLint | GLboolean): void {
    lib.symbols.glPixelStorei(pname, typeof param === "boolean" ? (param ? 1 : 0) : param);
  }

  polygonOffset(factor: GLfloat, units: GLfloat): void {
    lib.symbols.glPolygonOffset(factor, units);
  }

  readPixels(
    x: GLint,
    y: GLint,
    width: GLsizei,
    height: GLsizei,
    format: GLenum,
    type: GLenum,
    pixels: ArrayBufferView | null
  ): void {
    if (!pixels) return;
    const bytes = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength);
    lib.symbols.glReadPixels(x, y, width, height, format, type, ptr(bytes));
  }

  renderbufferStorage(
    target: GLenum,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei
  ): void {
    lib.symbols.glRenderbufferStorage(target, internalformat, width, height);
  }

  sampleCoverage(value: GLclampf, invert: GLboolean): void {
    lib.symbols.glSampleCoverage(value, invert ? 1 : 0);
  }

  scissor(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
    lib.symbols.glScissor(x, y, width, height);
  }

  shaderSource(shader: WebGLShader | null, source: string): void {
    if (!shader) return;
    const sourceBuffer = Buffer.from(source + "\0");
    const sourcePtrArray = new BigUint64Array([BigInt(ptr(sourceBuffer).valueOf())]);
    lib.symbols.glShaderSource(getHandle(shader), 1, ptr(sourcePtrArray), null);
  }

  stencilFunc(func: GLenum, ref: GLint, mask: GLuint): void {
    lib.symbols.glStencilFunc(func, ref, mask);
  }

  stencilFuncSeparate(face: GLenum, func: GLenum, ref: GLint, mask: GLuint): void {
    lib.symbols.glStencilFuncSeparate(face, func, ref, mask);
  }

  stencilMask(mask: GLuint): void {
    lib.symbols.glStencilMask(mask);
  }

  stencilMaskSeparate(face: GLenum, mask: GLuint): void {
    lib.symbols.glStencilMaskSeparate(face, mask);
  }

  stencilOp(fail: GLenum, zfail: GLenum, zpass: GLenum): void {
    lib.symbols.glStencilOp(fail, zfail, zpass);
  }

  stencilOpSeparate(face: GLenum, sfail: GLenum, dpfail: GLenum, dppass: GLenum): void {
    lib.symbols.glStencilOpSeparate(face, sfail, dpfail, dppass);
  }

  texImage2D(
    target: GLenum,
    level: GLint,
    internalformat: GLint,
    widthOrSource: GLsizei | TexImageSource,
    heightOrUnused?: GLsizei,
    borderOrUnused?: GLint,
    formatOrUnused?: GLenum,
    typeOrUnused?: GLenum,
    pixels?: ArrayBufferView | null
  ): void {
    // Handle overloaded signatures
    if (typeof widthOrSource === "number") {
      const width = widthOrSource;
      const height = heightOrUnused!;
      const border = borderOrUnused!;
      const format = formatOrUnused!;
      const type = typeOrUnused!;
      const data = pixels
        ? ptr(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength))
        : null;
      lib.symbols.glTexImage2D(
        target,
        level,
        internalformat,
        width,
        height,
        border,
        format,
        type,
        data
      );
    } else {
      // TexImageSource (ImageData, etc.) - not fully supported on darwin
      throw new Error("texImage2D with TexImageSource not supported on darwin");
    }
  }

  texParameterf(target: GLenum, pname: GLenum, param: GLfloat): void {
    lib.symbols.glTexParameterf(target, pname, param);
  }

  texParameteri(target: GLenum, pname: GLenum, param: GLint): void {
    lib.symbols.glTexParameteri(target, pname, param);
  }

  texSubImage2D(
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    widthOrSource: GLsizei | TexImageSource,
    heightOrUnused?: GLsizei,
    formatOrUnused?: GLenum,
    typeOrUnused?: GLenum,
    pixels?: ArrayBufferView | null
  ): void {
    if (typeof widthOrSource === "number") {
      const width = widthOrSource;
      const height = heightOrUnused!;
      const format = formatOrUnused!;
      const type = typeOrUnused!;
      const data = pixels
        ? ptr(new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength))
        : null;
      lib.symbols.glTexSubImage2D(
        target,
        level,
        xoffset,
        yoffset,
        width,
        height,
        format,
        type,
        data
      );
    } else {
      throw new Error("texSubImage2D with TexImageSource not supported on darwin");
    }
  }

  uniform1f(location: WebGLUniformLocation | null, x: GLfloat): void {
    if (!location) return;
    lib.symbols.glUniform1f(getHandle(location), x);
  }

  uniform1fv(location: WebGLUniformLocation | null, v: Float32List): void {
    if (!location) return;
    const arr = v instanceof Float32Array ? v : new Float32Array(v);
    lib.symbols.glUniform1fv(getHandle(location), arr.length, ptr(arr));
  }

  uniform1i(location: WebGLUniformLocation | null, x: GLint): void {
    if (!location) return;
    lib.symbols.glUniform1i(getHandle(location), x);
  }

  uniform1iv(location: WebGLUniformLocation | null, v: Int32List): void {
    if (!location) return;
    const arr = v instanceof Int32Array ? v : new Int32Array(v);
    lib.symbols.glUniform1iv(getHandle(location), arr.length, ptr(arr));
  }

  uniform2f(location: WebGLUniformLocation | null, x: GLfloat, y: GLfloat): void {
    if (!location) return;
    lib.symbols.glUniform2f(getHandle(location), x, y);
  }

  uniform2fv(location: WebGLUniformLocation | null, v: Float32List): void {
    if (!location) return;
    const arr = v instanceof Float32Array ? v : new Float32Array(v);
    lib.symbols.glUniform2fv(getHandle(location), arr.length / 2, ptr(arr));
  }

  uniform2i(location: WebGLUniformLocation | null, x: GLint, y: GLint): void {
    if (!location) return;
    lib.symbols.glUniform2i(getHandle(location), x, y);
  }

  uniform2iv(location: WebGLUniformLocation | null, v: Int32List): void {
    if (!location) return;
    const arr = v instanceof Int32Array ? v : new Int32Array(v);
    lib.symbols.glUniform2iv(getHandle(location), arr.length / 2, ptr(arr));
  }

  uniform3f(location: WebGLUniformLocation | null, x: GLfloat, y: GLfloat, z: GLfloat): void {
    if (!location) return;
    lib.symbols.glUniform3f(getHandle(location), x, y, z);
  }

  uniform3fv(location: WebGLUniformLocation | null, v: Float32List): void {
    if (!location) return;
    const arr = v instanceof Float32Array ? v : new Float32Array(v);
    lib.symbols.glUniform3fv(getHandle(location), arr.length / 3, ptr(arr));
  }

  uniform3i(location: WebGLUniformLocation | null, x: GLint, y: GLint, z: GLint): void {
    if (!location) return;
    lib.symbols.glUniform3i(getHandle(location), x, y, z);
  }

  uniform3iv(location: WebGLUniformLocation | null, v: Int32List): void {
    if (!location) return;
    const arr = v instanceof Int32Array ? v : new Int32Array(v);
    lib.symbols.glUniform3iv(getHandle(location), arr.length / 3, ptr(arr));
  }

  uniform4f(
    location: WebGLUniformLocation | null,
    x: GLfloat,
    y: GLfloat,
    z: GLfloat,
    w: GLfloat
  ): void {
    if (!location) return;
    lib.symbols.glUniform4f(getHandle(location), x, y, z, w);
  }

  uniform4fv(location: WebGLUniformLocation | null, v: Float32List): void {
    if (!location) return;
    const arr = v instanceof Float32Array ? v : new Float32Array(v);
    lib.symbols.glUniform4fv(getHandle(location), arr.length / 4, ptr(arr));
  }

  uniform4i(location: WebGLUniformLocation | null, x: GLint, y: GLint, z: GLint, w: GLint): void {
    if (!location) return;
    lib.symbols.glUniform4i(getHandle(location), x, y, z, w);
  }

  uniform4iv(location: WebGLUniformLocation | null, v: Int32List): void {
    if (!location) return;
    const arr = v instanceof Int32Array ? v : new Int32Array(v);
    lib.symbols.glUniform4iv(getHandle(location), arr.length / 4, ptr(arr));
  }

  uniformMatrix2fv(
    location: WebGLUniformLocation | null,
    transpose: GLboolean,
    value: Float32List
  ): void {
    if (!location) return;
    const arr = value instanceof Float32Array ? value : new Float32Array(value);
    lib.symbols.glUniformMatrix2fv(
      getHandle(location),
      arr.length / 4,
      transpose ? 1 : 0,
      ptr(arr)
    );
  }

  uniformMatrix3fv(
    location: WebGLUniformLocation | null,
    transpose: GLboolean,
    value: Float32List
  ): void {
    if (!location) return;
    const arr = value instanceof Float32Array ? value : new Float32Array(value);
    lib.symbols.glUniformMatrix3fv(
      getHandle(location),
      arr.length / 9,
      transpose ? 1 : 0,
      ptr(arr)
    );
  }

  uniformMatrix4fv(
    location: WebGLUniformLocation | null,
    transpose: GLboolean,
    value: Float32List
  ): void {
    if (!location) return;
    const arr = value instanceof Float32Array ? value : new Float32Array(value);
    lib.symbols.glUniformMatrix4fv(
      getHandle(location),
      arr.length / 16,
      transpose ? 1 : 0,
      ptr(arr)
    );
  }

  useProgram(program: WebGLProgram | null): void {
    lib.symbols.glUseProgram(getHandle(program));
  }

  validateProgram(program: WebGLProgram | null): void {
    if (!program) return;
    lib.symbols.glValidateProgram(getHandle(program));
  }

  vertexAttrib1f(index: GLuint, x: GLfloat): void {
    lib.symbols.glVertexAttrib1f(index, x);
  }

  vertexAttrib1fv(index: GLuint, values: Float32List): void {
    const arr = values instanceof Float32Array ? values : new Float32Array(values);
    lib.symbols.glVertexAttrib1fv(index, ptr(arr));
  }

  vertexAttrib2f(index: GLuint, x: GLfloat, y: GLfloat): void {
    lib.symbols.glVertexAttrib2f(index, x, y);
  }

  vertexAttrib2fv(index: GLuint, values: Float32List): void {
    const arr = values instanceof Float32Array ? values : new Float32Array(values);
    lib.symbols.glVertexAttrib2fv(index, ptr(arr));
  }

  vertexAttrib3f(index: GLuint, x: GLfloat, y: GLfloat, z: GLfloat): void {
    lib.symbols.glVertexAttrib3f(index, x, y, z);
  }

  vertexAttrib3fv(index: GLuint, values: Float32List): void {
    const arr = values instanceof Float32Array ? values : new Float32Array(values);
    lib.symbols.glVertexAttrib3fv(index, ptr(arr));
  }

  vertexAttrib4f(index: GLuint, x: GLfloat, y: GLfloat, z: GLfloat, w: GLfloat): void {
    lib.symbols.glVertexAttrib4f(index, x, y, z, w);
  }

  vertexAttrib4fv(index: GLuint, values: Float32List): void {
    const arr = values instanceof Float32Array ? values : new Float32Array(values);
    lib.symbols.glVertexAttrib4fv(index, ptr(arr));
  }

  vertexAttribPointer(
    index: GLuint,
    size: GLint,
    type: GLenum,
    normalized: GLboolean,
    stride: GLsizei,
    offset: GLintptr
  ): void {
    lib.symbols.glVertexAttribPointer(
      index,
      size,
      type,
      normalized ? 1 : 0,
      stride,
      offset as unknown as ReturnType<typeof ptr>
    );
  }

  viewport(x: GLint, y: GLint, width: GLsizei, height: GLsizei): void {
    lib.symbols.glViewport(x, y, width, height);
  }

  // ============================================================
  // WebGL2 Methods
  // ============================================================

  copyBufferSubData(
    readTarget: GLenum,
    writeTarget: GLenum,
    readOffset: GLintptr,
    writeOffset: GLintptr,
    size: GLsizeiptr
  ): void {
    lib.symbols.glCopyBufferSubData(
      readTarget,
      writeTarget,
      BigInt(readOffset),
      BigInt(writeOffset),
      BigInt(size)
    );
  }

  getBufferSubData(
    target: GLenum,
    srcByteOffset: GLintptr,
    dstBuffer: ArrayBufferView,
    _dstOffset?: GLuint,
    _length?: GLuint
  ): void {
    const bytes = new Uint8Array(dstBuffer.buffer, dstBuffer.byteOffset, dstBuffer.byteLength);
    lib.symbols.glGetBufferSubData(
      target,
      BigInt(srcByteOffset),
      BigInt(bytes.byteLength),
      ptr(bytes)
    );
  }

  blitFramebuffer(
    srcX0: GLint,
    srcY0: GLint,
    srcX1: GLint,
    srcY1: GLint,
    dstX0: GLint,
    dstY0: GLint,
    dstX1: GLint,
    dstY1: GLint,
    mask: GLbitfield,
    filter: GLenum
  ): void {
    lib.symbols.glBlitFramebuffer(
      srcX0,
      srcY0,
      srcX1,
      srcY1,
      dstX0,
      dstY0,
      dstX1,
      dstY1,
      mask,
      filter
    );
  }

  framebufferTextureLayer(
    target: GLenum,
    attachment: GLenum,
    texture: WebGLTexture | null,
    level: GLint,
    layer: GLint
  ): void {
    lib.symbols.glFramebufferTextureLayer(target, attachment, getHandle(texture), level, layer);
  }

  invalidateFramebuffer(_target: GLenum, _attachments: GLenum[]): void {
    // glInvalidateFramebuffer is OpenGL 4.3, not available on macOS OpenGL 3.2
    // This is a performance hint, so it's safe to no-op
  }

  invalidateSubFramebuffer(
    _target: GLenum,
    _attachments: GLenum[],
    _x: GLint,
    _y: GLint,
    _width: GLsizei,
    _height: GLsizei
  ): void {
    // glInvalidateSubFramebuffer is OpenGL 4.3, not available on macOS OpenGL 3.2
    // This is a performance hint, so it's safe to no-op
  }

  readBuffer(src: GLenum): void {
    lib.symbols.glReadBuffer(src);
  }

  getInternalformatParameter(_target: GLenum, _internalformat: GLenum, _pname: GLenum): unknown {
    // Not directly available in OpenGL; would need extension
    return null;
  }

  renderbufferStorageMultisample(
    target: GLenum,
    samples: GLsizei,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei
  ): void {
    lib.symbols.glRenderbufferStorageMultisample(target, samples, internalformat, width, height);
  }

  texStorage2D(
    target: GLenum,
    levels: GLsizei,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei
  ): void {
    lib.symbols.glTexStorage2D(target, levels, internalformat, width, height);
  }

  texStorage3D(
    target: GLenum,
    levels: GLsizei,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei,
    depth: GLsizei
  ): void {
    lib.symbols.glTexStorage3D(target, levels, internalformat, width, height, depth);
  }

  texImage3D(
    target: GLenum,
    level: GLint,
    internalformat: GLint,
    width: GLsizei,
    height: GLsizei,
    depth: GLsizei,
    border: GLint,
    format: GLenum,
    type: GLenum,
    pboOffsetOrSource: GLintptr | TexImageSource | ArrayBufferView | null
  ): void {
    if (pboOffsetOrSource === null || typeof pboOffsetOrSource === "number") {
      lib.symbols.glTexImage3D(
        target,
        level,
        internalformat,
        width,
        height,
        depth,
        border,
        format,
        type,
        null
      );
    } else if (ArrayBuffer.isView(pboOffsetOrSource)) {
      const data = ptr(
        new Uint8Array(
          pboOffsetOrSource.buffer,
          pboOffsetOrSource.byteOffset,
          pboOffsetOrSource.byteLength
        )
      );
      lib.symbols.glTexImage3D(
        target,
        level,
        internalformat,
        width,
        height,
        depth,
        border,
        format,
        type,
        data
      );
    } else {
      throw new Error("texImage3D with TexImageSource not supported");
    }
  }

  texSubImage3D(
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    zoffset: GLint,
    width: GLsizei,
    height: GLsizei,
    depth: GLsizei,
    format: GLenum,
    type: GLenum,
    pboOffsetOrSource: GLintptr | TexImageSource | ArrayBufferView | null
  ): void {
    if (pboOffsetOrSource === null || typeof pboOffsetOrSource === "number") {
      lib.symbols.glTexSubImage3D(
        target,
        level,
        xoffset,
        yoffset,
        zoffset,
        width,
        height,
        depth,
        format,
        type,
        null
      );
    } else if (ArrayBuffer.isView(pboOffsetOrSource)) {
      const data = ptr(
        new Uint8Array(
          pboOffsetOrSource.buffer,
          pboOffsetOrSource.byteOffset,
          pboOffsetOrSource.byteLength
        )
      );
      lib.symbols.glTexSubImage3D(
        target,
        level,
        xoffset,
        yoffset,
        zoffset,
        width,
        height,
        depth,
        format,
        type,
        data
      );
    } else {
      throw new Error("texSubImage3D with TexImageSource not supported");
    }
  }

  copyTexSubImage3D(
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    zoffset: GLint,
    x: GLint,
    y: GLint,
    width: GLsizei,
    height: GLsizei
  ): void {
    lib.symbols.glCopyTexSubImage3D(target, level, xoffset, yoffset, zoffset, x, y, width, height);
  }

  compressedTexImage3D(
    target: GLenum,
    level: GLint,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei,
    depth: GLsizei,
    border: GLint,
    imageSize: GLsizei,
    offset: GLintptr
  ): void;
  compressedTexImage3D(
    target: GLenum,
    level: GLint,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei,
    depth: GLsizei,
    border: GLint,
    srcData: ArrayBufferView,
    srcOffset?: GLuint,
    srcLengthOverride?: GLuint
  ): void;
  compressedTexImage3D(
    target: GLenum,
    level: GLint,
    internalformat: GLenum,
    width: GLsizei,
    height: GLsizei,
    depth: GLsizei,
    border: GLint,
    imageSizeOrData: GLsizei | ArrayBufferView,
    offsetOrSrcOffset?: GLintptr | GLuint,
    _srcLengthOverride?: GLuint
  ): void {
    if (typeof imageSizeOrData === "number") {
      // PBO path - not fully implemented
      lib.symbols.glCompressedTexImage3D(
        target,
        level,
        internalformat,
        width,
        height,
        depth,
        border,
        imageSizeOrData,
        null
      );
    } else {
      const srcOffset = (offsetOrSrcOffset as GLuint) ?? 0;
      const bytes = new Uint8Array(
        imageSizeOrData.buffer,
        imageSizeOrData.byteOffset + srcOffset,
        imageSizeOrData.byteLength - srcOffset
      );
      lib.symbols.glCompressedTexImage3D(
        target,
        level,
        internalformat,
        width,
        height,
        depth,
        border,
        bytes.byteLength,
        ptr(bytes)
      );
    }
  }

  compressedTexSubImage3D(
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    zoffset: GLint,
    width: GLsizei,
    height: GLsizei,
    depth: GLsizei,
    format: GLenum,
    imageSize: GLsizei,
    offset: GLintptr
  ): void;
  compressedTexSubImage3D(
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    zoffset: GLint,
    width: GLsizei,
    height: GLsizei,
    depth: GLsizei,
    format: GLenum,
    srcData: ArrayBufferView,
    srcOffset?: GLuint,
    srcLengthOverride?: GLuint
  ): void;
  compressedTexSubImage3D(
    target: GLenum,
    level: GLint,
    xoffset: GLint,
    yoffset: GLint,
    zoffset: GLint,
    width: GLsizei,
    height: GLsizei,
    depth: GLsizei,
    format: GLenum,
    imageSizeOrData: GLsizei | ArrayBufferView,
    offsetOrSrcOffset?: GLintptr | GLuint,
    _srcLengthOverride?: GLuint
  ): void {
    if (typeof imageSizeOrData === "number") {
      lib.symbols.glCompressedTexSubImage3D(
        target,
        level,
        xoffset,
        yoffset,
        zoffset,
        width,
        height,
        depth,
        format,
        imageSizeOrData,
        null
      );
    } else {
      const srcOffset = (offsetOrSrcOffset as GLuint) ?? 0;
      const bytes = new Uint8Array(
        imageSizeOrData.buffer,
        imageSizeOrData.byteOffset + srcOffset,
        imageSizeOrData.byteLength - srcOffset
      );
      lib.symbols.glCompressedTexSubImage3D(
        target,
        level,
        xoffset,
        yoffset,
        zoffset,
        width,
        height,
        depth,
        format,
        bytes.byteLength,
        ptr(bytes)
      );
    }
  }

  getFragDataLocation(program: WebGLProgram | null, name: string): GLint {
    if (!program) return -1;
    const nameBuffer = Buffer.from(name + "\0");
    return lib.symbols.glGetFragDataLocation(getHandle(program), ptr(nameBuffer));
  }

  uniform1ui(location: WebGLUniformLocation | null, v0: GLuint): void {
    if (!location) return;
    lib.symbols.glUniform1ui(getHandle(location), v0);
  }

  uniform2ui(location: WebGLUniformLocation | null, v0: GLuint, v1: GLuint): void {
    if (!location) return;
    lib.symbols.glUniform2ui(getHandle(location), v0, v1);
  }

  uniform3ui(location: WebGLUniformLocation | null, v0: GLuint, v1: GLuint, v2: GLuint): void {
    if (!location) return;
    lib.symbols.glUniform3ui(getHandle(location), v0, v1, v2);
  }

  uniform4ui(
    location: WebGLUniformLocation | null,
    v0: GLuint,
    v1: GLuint,
    v2: GLuint,
    v3: GLuint
  ): void {
    if (!location) return;
    lib.symbols.glUniform4ui(getHandle(location), v0, v1, v2, v3);
  }

  uniform1uiv(
    location: WebGLUniformLocation | null,
    data: Uint32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Uint32Array ? data : new Uint32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Uint32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniform1uiv(getHandle(location), length, ptr(view));
  }

  uniform2uiv(
    location: WebGLUniformLocation | null,
    data: Uint32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Uint32Array ? data : new Uint32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Uint32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniform2uiv(getHandle(location), length / 2, ptr(view));
  }

  uniform3uiv(
    location: WebGLUniformLocation | null,
    data: Uint32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Uint32Array ? data : new Uint32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Uint32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniform3uiv(getHandle(location), length / 3, ptr(view));
  }

  uniform4uiv(
    location: WebGLUniformLocation | null,
    data: Uint32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Uint32Array ? data : new Uint32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Uint32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniform4uiv(getHandle(location), length / 4, ptr(view));
  }

  uniformMatrix3x2fv(
    location: WebGLUniformLocation | null,
    transpose: GLboolean,
    data: Float32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Float32Array ? data : new Float32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Float32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniformMatrix3x2fv(getHandle(location), length / 6, transpose ? 1 : 0, ptr(view));
  }

  uniformMatrix4x2fv(
    location: WebGLUniformLocation | null,
    transpose: GLboolean,
    data: Float32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Float32Array ? data : new Float32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Float32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniformMatrix4x2fv(getHandle(location), length / 8, transpose ? 1 : 0, ptr(view));
  }

  uniformMatrix2x3fv(
    location: WebGLUniformLocation | null,
    transpose: GLboolean,
    data: Float32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Float32Array ? data : new Float32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Float32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniformMatrix2x3fv(getHandle(location), length / 6, transpose ? 1 : 0, ptr(view));
  }

  uniformMatrix4x3fv(
    location: WebGLUniformLocation | null,
    transpose: GLboolean,
    data: Float32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Float32Array ? data : new Float32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Float32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniformMatrix4x3fv(
      getHandle(location),
      length / 12,
      transpose ? 1 : 0,
      ptr(view)
    );
  }

  uniformMatrix2x4fv(
    location: WebGLUniformLocation | null,
    transpose: GLboolean,
    data: Float32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Float32Array ? data : new Float32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Float32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniformMatrix2x4fv(getHandle(location), length / 8, transpose ? 1 : 0, ptr(view));
  }

  uniformMatrix3x4fv(
    location: WebGLUniformLocation | null,
    transpose: GLboolean,
    data: Float32List,
    srcOffset?: GLuint,
    srcLength?: GLuint
  ): void {
    if (!location) return;
    const offset = srcOffset ?? 0;
    const arr = data instanceof Float32Array ? data : new Float32Array(data);
    const length = srcLength ?? arr.length - offset;
    const view = new Float32Array(arr.buffer, arr.byteOffset + offset * 4, length);
    lib.symbols.glUniformMatrix3x4fv(
      getHandle(location),
      length / 12,
      transpose ? 1 : 0,
      ptr(view)
    );
  }

  vertexAttribI4i(index: GLuint, x: GLint, y: GLint, z: GLint, w: GLint): void {
    lib.symbols.glVertexAttribI4i(index, x, y, z, w);
  }

  vertexAttribI4iv(index: GLuint, values: Int32List): void {
    const arr = values instanceof Int32Array ? values : new Int32Array(values);
    lib.symbols.glVertexAttribI4iv(index, ptr(arr));
  }

  vertexAttribI4ui(index: GLuint, x: GLuint, y: GLuint, z: GLuint, w: GLuint): void {
    lib.symbols.glVertexAttribI4ui(index, x, y, z, w);
  }

  vertexAttribI4uiv(index: GLuint, values: Uint32List): void {
    const arr = values instanceof Uint32Array ? values : new Uint32Array(values);
    lib.symbols.glVertexAttribI4uiv(index, ptr(arr));
  }

  vertexAttribIPointer(
    index: GLuint,
    size: GLint,
    type: GLenum,
    stride: GLsizei,
    offset: GLintptr
  ): void {
    lib.symbols.glVertexAttribIPointer(
      index,
      size,
      type,
      stride,
      offset as unknown as ReturnType<typeof ptr>
    );
  }

  vertexAttribDivisor(index: GLuint, divisor: GLuint): void {
    lib.symbols.glVertexAttribDivisor(index, divisor);
  }

  drawArraysInstanced(mode: GLenum, first: GLint, count: GLsizei, instanceCount: GLsizei): void {
    lib.symbols.glDrawArraysInstanced(mode, first, count, instanceCount);
  }

  drawElementsInstanced(
    mode: GLenum,
    count: GLsizei,
    type: GLenum,
    offset: GLintptr,
    instanceCount: GLsizei
  ): void {
    lib.symbols.glDrawElementsInstanced(
      mode,
      count,
      type,
      offset as unknown as ReturnType<typeof ptr>,
      instanceCount
    );
  }

  drawRangeElements(
    mode: GLenum,
    start: GLuint,
    end: GLuint,
    count: GLsizei,
    type: GLenum,
    offset: GLintptr
  ): void {
    lib.symbols.glDrawRangeElements(
      mode,
      start,
      end,
      count,
      type,
      offset as unknown as ReturnType<typeof ptr>
    );
  }

  drawBuffers(buffers: GLenum[]): void {
    const arr = new Uint32Array(buffers);
    lib.symbols.glDrawBuffers(buffers.length, ptr(arr));
  }

  clearBufferfv(buffer: GLenum, drawbuffer: GLint, values: Float32List, srcOffset?: GLuint): void {
    const offset = srcOffset ?? 0;
    const arr = values instanceof Float32Array ? values : new Float32Array(values);
    const view = new Float32Array(arr.buffer, arr.byteOffset + offset * 4, arr.length - offset);
    lib.symbols.glClearBufferfv(buffer, drawbuffer, ptr(view));
  }

  clearBufferiv(buffer: GLenum, drawbuffer: GLint, values: Int32List, srcOffset?: GLuint): void {
    const offset = srcOffset ?? 0;
    const arr = values instanceof Int32Array ? values : new Int32Array(values);
    const view = new Int32Array(arr.buffer, arr.byteOffset + offset * 4, arr.length - offset);
    lib.symbols.glClearBufferiv(buffer, drawbuffer, ptr(view));
  }

  clearBufferuiv(buffer: GLenum, drawbuffer: GLint, values: Uint32List, srcOffset?: GLuint): void {
    const offset = srcOffset ?? 0;
    const arr = values instanceof Uint32Array ? values : new Uint32Array(values);
    const view = new Uint32Array(arr.buffer, arr.byteOffset + offset * 4, arr.length - offset);
    lib.symbols.glClearBufferuiv(buffer, drawbuffer, ptr(view));
  }

  clearBufferfi(buffer: GLenum, drawbuffer: GLint, depth: GLfloat, stencil: GLint): void {
    lib.symbols.glClearBufferfi(buffer, drawbuffer, depth, stencil);
  }

  // Query objects
  createQuery(): WebGLQuery | null {
    const queries = new Uint32Array(1);
    lib.symbols.glGenQueries(1, ptr(queries));
    const handle = queries[0]!;
    return handle ? new DarwinWebGLQuery(handle) : null;
  }

  deleteQuery(query: WebGLQuery | null): void {
    if (!query) return;
    const queries = new Uint32Array([getHandle(query)]);
    lib.symbols.glDeleteQueries(1, ptr(queries));
  }

  isQuery(query: WebGLQuery | null): GLboolean {
    if (!query) return false;
    return lib.symbols.glIsQuery(getHandle(query)) !== 0;
  }

  beginQuery(target: GLenum, query: WebGLQuery | null): void {
    if (!query) return;
    lib.symbols.glBeginQuery(target, getHandle(query));
  }

  endQuery(target: GLenum): void {
    lib.symbols.glEndQuery(target);
  }

  getQuery(target: GLenum, pname: GLenum): WebGLQuery | null {
    const buffer = new Uint32Array(1);
    lib.symbols.glGetQueryiv(target, pname, ptr(buffer));
    return buffer[0] ? new DarwinWebGLQuery(buffer[0]) : null;
  }

  getQueryParameter(query: WebGLQuery | null, pname: GLenum): unknown {
    if (!query) return null;
    const buffer = new Uint32Array(1);
    lib.symbols.glGetQueryObjectuiv(getHandle(query), pname, ptr(buffer));
    if (pname === this.QUERY_RESULT_AVAILABLE) {
      return buffer[0] !== 0;
    }
    return buffer[0];
  }

  // Sampler objects
  createSampler(): WebGLSampler | null {
    const samplers = new Uint32Array(1);
    lib.symbols.glGenSamplers(1, ptr(samplers));
    const handle = samplers[0]!;
    return handle ? new DarwinWebGLSampler(handle) : null;
  }

  deleteSampler(sampler: WebGLSampler | null): void {
    if (!sampler) return;
    const samplers = new Uint32Array([getHandle(sampler)]);
    lib.symbols.glDeleteSamplers(1, ptr(samplers));
  }

  isSampler(sampler: WebGLSampler | null): GLboolean {
    if (!sampler) return false;
    return lib.symbols.glIsSampler(getHandle(sampler)) !== 0;
  }

  bindSampler(unit: GLuint, sampler: WebGLSampler | null): void {
    lib.symbols.glBindSampler(unit, getHandle(sampler));
  }

  samplerParameteri(sampler: WebGLSampler | null, pname: GLenum, param: GLint): void {
    if (!sampler) return;
    lib.symbols.glSamplerParameteri(getHandle(sampler), pname, param);
  }

  samplerParameterf(sampler: WebGLSampler | null, pname: GLenum, param: GLfloat): void {
    if (!sampler) return;
    lib.symbols.glSamplerParameterf(getHandle(sampler), pname, param);
  }

  getSamplerParameter(sampler: WebGLSampler | null, pname: GLenum): unknown {
    if (!sampler) return null;
    const buffer = new Int32Array(1);
    lib.symbols.glGetSamplerParameteriv(getHandle(sampler), pname, ptr(buffer));
    return buffer[0];
  }

  // Sync objects
  fenceSync(condition: GLenum, flags: GLbitfield): WebGLSync | null {
    const handle = lib.symbols.glFenceSync(condition, flags);
    return handle ? new DarwinWebGLSync(Number(handle)) : null;
  }

  isSync(sync: WebGLSync | null): GLboolean {
    if (!sync) return false;
    return lib.symbols.glIsSync(getHandle(sync) as unknown as ReturnType<typeof ptr>) !== 0;
  }

  deleteSync(sync: WebGLSync | null): void {
    if (!sync) return;
    lib.symbols.glDeleteSync(getHandle(sync) as unknown as ReturnType<typeof ptr>);
  }

  clientWaitSync(sync: WebGLSync | null, flags: GLbitfield, timeout: GLuint64): GLenum {
    if (!sync) return this.WAIT_FAILED;
    return lib.symbols.glClientWaitSync(
      getHandle(sync) as unknown as ReturnType<typeof ptr>,
      flags,
      BigInt(timeout)
    );
  }

  waitSync(sync: WebGLSync | null, flags: GLbitfield, timeout: GLint64): void {
    if (!sync) return;
    lib.symbols.glWaitSync(
      getHandle(sync) as unknown as ReturnType<typeof ptr>,
      flags,
      BigInt(timeout)
    );
  }

  getSyncParameter(sync: WebGLSync | null, pname: GLenum): unknown {
    if (!sync) return null;
    const length = new Int32Array(1);
    const values = new Int32Array(1);
    lib.symbols.glGetSynciv(
      getHandle(sync) as unknown as ReturnType<typeof ptr>,
      pname,
      1,
      ptr(length),
      ptr(values)
    );
    return values[0];
  }

  // Transform feedback
  createTransformFeedback(): WebGLTransformFeedback | null {
    const feedbacks = new Uint32Array(1);
    lib.symbols.glGenTransformFeedbacks(1, ptr(feedbacks));
    const handle = feedbacks[0]!;
    return handle ? new DarwinWebGLTransformFeedback(handle) : null;
  }

  deleteTransformFeedback(tf: WebGLTransformFeedback | null): void {
    if (!tf) return;
    const feedbacks = new Uint32Array([getHandle(tf)]);
    lib.symbols.glDeleteTransformFeedbacks(1, ptr(feedbacks));
  }

  isTransformFeedback(tf: WebGLTransformFeedback | null): GLboolean {
    if (!tf) return false;
    return lib.symbols.glIsTransformFeedback(getHandle(tf)) !== 0;
  }

  bindTransformFeedback(target: GLenum, tf: WebGLTransformFeedback | null): void {
    lib.symbols.glBindTransformFeedback(target, getHandle(tf));
  }

  beginTransformFeedback(primitiveMode: GLenum): void {
    lib.symbols.glBeginTransformFeedback(primitiveMode);
  }

  endTransformFeedback(): void {
    lib.symbols.glEndTransformFeedback();
  }

  transformFeedbackVaryings(
    program: WebGLProgram | null,
    varyings: string[],
    bufferMode: GLenum
  ): void {
    if (!program) return;
    const buffers = varyings.map((s) => Buffer.from(s + "\0"));
    const ptrs = new BigUint64Array(buffers.map((b) => BigInt(ptr(b).valueOf())));
    lib.symbols.glTransformFeedbackVaryings(
      getHandle(program),
      varyings.length,
      ptr(ptrs),
      bufferMode
    );
  }

  getTransformFeedbackVarying(program: WebGLProgram | null, index: GLuint): WebGLActiveInfo | null {
    if (!program) return null;
    const length = new Int32Array(1);
    const size = new Int32Array(1);
    const type = new Uint32Array(1);
    const nameBuffer = Buffer.alloc(256);
    lib.symbols.glGetTransformFeedbackVarying(
      getHandle(program),
      index,
      256,
      ptr(length),
      ptr(size),
      ptr(type),
      ptr(nameBuffer)
    );
    const name = nameBuffer.toString("utf8", 0, length[0]!);
    return new DarwinWebGLActiveInfo(name, size[0]!, type[0]!);
  }

  pauseTransformFeedback(): void {
    lib.symbols.glPauseTransformFeedback();
  }

  resumeTransformFeedback(): void {
    lib.symbols.glResumeTransformFeedback();
  }

  // Buffer binding
  bindBufferBase(target: GLenum, index: GLuint, buffer: WebGLBuffer | null): void {
    lib.symbols.glBindBufferBase(target, index, getHandle(buffer));
  }

  bindBufferRange(
    target: GLenum,
    index: GLuint,
    buffer: WebGLBuffer | null,
    offset: GLintptr,
    size: GLsizeiptr
  ): void {
    lib.symbols.glBindBufferRange(target, index, getHandle(buffer), BigInt(offset), BigInt(size));
  }

  getIndexedParameter(_target: GLenum, _index: GLuint): unknown {
    // This would need specific handling per target
    return null;
  }

  // Uniform blocks
  getUniformIndices(program: WebGLProgram | null, uniformNames: string[]): GLuint[] | null {
    if (!program) return null;
    const buffers = uniformNames.map((s) => Buffer.from(s + "\0"));
    const ptrs = new BigUint64Array(buffers.map((b) => BigInt(ptr(b).valueOf())));
    const indices = new Uint32Array(uniformNames.length);
    lib.symbols.glGetUniformIndices(
      getHandle(program),
      uniformNames.length,
      ptr(ptrs),
      ptr(indices)
    );
    return Array.from(indices);
  }

  getActiveUniforms(
    program: WebGLProgram | null,
    uniformIndices: GLuint[],
    pname: GLenum
  ): unknown {
    if (!program) return null;
    const indices = new Uint32Array(uniformIndices);
    const params = new Int32Array(uniformIndices.length);
    lib.symbols.glGetActiveUniformsiv(
      getHandle(program),
      uniformIndices.length,
      ptr(indices),
      pname,
      ptr(params)
    );
    return Array.from(params);
  }

  getUniformBlockIndex(program: WebGLProgram | null, uniformBlockName: string): GLuint {
    if (!program) return this.INVALID_INDEX;
    const nameBuffer = Buffer.from(uniformBlockName + "\0");
    return lib.symbols.glGetUniformBlockIndex(getHandle(program), ptr(nameBuffer));
  }

  getActiveUniformBlockParameter(
    program: WebGLProgram | null,
    uniformBlockIndex: GLuint,
    pname: GLenum
  ): unknown {
    if (!program) return null;
    const buffer = new Int32Array(16);
    lib.symbols.glGetActiveUniformBlockiv(
      getHandle(program),
      uniformBlockIndex,
      pname,
      ptr(buffer)
    );
    if (pname === this.UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES) {
      // Return array of indices
      const count = new Int32Array(1);
      lib.symbols.glGetActiveUniformBlockiv(
        getHandle(program),
        uniformBlockIndex,
        this.UNIFORM_BLOCK_ACTIVE_UNIFORMS,
        ptr(count)
      );
      return Array.from(buffer.slice(0, count[0]!));
    }
    return buffer[0];
  }

  getActiveUniformBlockName(
    program: WebGLProgram | null,
    uniformBlockIndex: GLuint
  ): string | null {
    if (!program) return null;
    const length = new Int32Array(1);
    const nameBuffer = Buffer.alloc(256);
    lib.symbols.glGetActiveUniformBlockName(
      getHandle(program),
      uniformBlockIndex,
      256,
      ptr(length),
      ptr(nameBuffer)
    );
    return nameBuffer.toString("utf8", 0, length[0]!);
  }

  uniformBlockBinding(
    program: WebGLProgram | null,
    uniformBlockIndex: GLuint,
    uniformBlockBinding: GLuint
  ): void {
    if (!program) return;
    lib.symbols.glUniformBlockBinding(getHandle(program), uniformBlockIndex, uniformBlockBinding);
  }

  // Vertex Array Objects
  createVertexArray(): WebGLVertexArrayObject | null {
    const arrays = new Uint32Array(1);
    lib.symbols.glGenVertexArrays(1, ptr(arrays));
    const handle = arrays[0]!;
    return handle ? new DarwinWebGLVertexArrayObject(handle) : null;
  }

  deleteVertexArray(vertexArray: WebGLVertexArrayObject | null): void {
    if (!vertexArray) return;
    const arrays = new Uint32Array([getHandle(vertexArray)]);
    lib.symbols.glDeleteVertexArrays(1, ptr(arrays));
  }

  isVertexArray(vertexArray: WebGLVertexArrayObject | null): GLboolean {
    if (!vertexArray) return false;
    return lib.symbols.glIsVertexArray(getHandle(vertexArray)) !== 0;
  }

  bindVertexArray(array: WebGLVertexArrayObject | null): void {
    lib.symbols.glBindVertexArray(getHandle(array));
  }

  // Placeholder/stub implementations for methods not yet fully implemented
  makeXRCompatible(): Promise<void> {
    return Promise.reject(new Error("XR not supported"));
  }
}
