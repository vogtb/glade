import { ImagePlaceholder } from "./ImagePlaceholder";
import { QuickLinks } from "./QuickLinks";

export function Hero() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sm:text-4xl text-[32px] sm:leading-12.5 leading-11 font-medium">
        Glade is a TypeScript GUI library that uses WebGPU to render apps at 120fps, whether you're
        targeting a browser or native macOS.
      </h1>
      <span className="text-base text-gray-600">
        Glade† is a library for writing cross-platform graphical applications with TS/JS. It uses{" "}
        <a
          href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API"
          target="_blank"
          rel="noopener noreferrer"
        >
          WebGPU
        </a>{" "}
        , and includes an application framework and component library (text, inputs, flexbox
        layouts, etc.), all drawn using WebGPU, whether the context is a canvas element or a{" "}
        <a href="https://www.glfw.org/" target="_blank" rel="noopener noreferrer">
          GLFW
        </a>{" "}
        window on macOS via Google's{" "}
        <a href="https://github.com/google/dawn" target="_blank" rel="noopener noreferrer">
          Dawn WebGPU implementation
        </a>
        .
      </span>
      <div className="flex items-center justify-center gap-2">
        <div className="h-px flex-1 bg-linear-to-r from-transparent to-[rgb(255,137,4)]"></div>
        <span className="font-mono font-medium text-[12px] tracking-wider uppercase px-2 text-[rgb(255,137,4)]">
          Alpha Release
        </span>
        <div className="h-px flex-1 bg-linear-to-l from-transparent to-[rgb(255,137,4)]"></div>
      </div>
      <div className="mt-2">
        <ImagePlaceholder />
      </div>
      <QuickLinks />
    </div>
  );
}
