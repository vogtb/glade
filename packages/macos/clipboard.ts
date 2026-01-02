import type { Clipboard } from "@glade/core";
import { glfw, type GLFWwindow } from "@glade/glfw";

class MacOSClipboard implements Clipboard {
  private window: GLFWwindow;

  constructor(window: GLFWwindow) {
    this.window = window;
  }

  get isSupported(): boolean {
    return true;
  }

  get supportsReadText(): boolean {
    return true;
  }

  get supportsWriteText(): boolean {
    return true;
  }

  async readText(): Promise<string> {
    const glfwValue = glfw.getClipboardString(this.window);
    return Promise.resolve(glfwValue ?? "");
  }

  async writeText(text: string): Promise<void> {
    glfw.setClipboardString(this.window, text);
  }
}

export function createClipboard(window: GLFWwindow): Clipboard {
  return new MacOSClipboard(window);
}
