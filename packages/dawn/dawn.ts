// @ts-expect-error - Bun-specific import attribute
import DAWN_PATH from "../../vendor/libwebgpu_dawn.dylib" with { type: "file" };

console.log(`using embedded libwebgpu_dawn.dylib at DAWN_PATH=${DAWN_PATH}`);
