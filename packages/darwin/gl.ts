import { dlopen, FFIType } from "bun:ffi";

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
