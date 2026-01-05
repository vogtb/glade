import { ALL_DEMOS } from "@glade/demos/library";
import { useState } from "react";

import { ComponentDemoButton } from "./components/ComponentDemoButton";
import { DemoShowcase } from "./components/DemoShowcase";
import { DiagramPlaceholder } from "./components/DiagramPlaceholder";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { ImagePlaceholder } from "./components/ImagePlaceholder";
import { LiveDemo } from "./components/LiveDemo";
import { SectionTag } from "./components/SectionTag";
import { SubSectionWithArrow } from "./components/SubSectionWithArrow";

const componentDemos = [
  {
    name: "Padding",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'div',
  padding: { top: 20, right: 15, bottom: 20, left: 15 },
  children: [
    { type: 'text', content: 'Hello with padding!' }
  ]
});`,
  },
  {
    name: "Borders",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'div',
  border: { width: 2, color: '#ff6b35', radius: 8 },
  children: [
    { type: 'text', content: 'Bordered content' }
  ]
});`,
  },
  {
    name: "Divs",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'div',
  style: { display: 'flex', gap: 10 },
  children: [
    { type: 'div', style: { flex: 1, bg: '#eee' } },
    { type: 'div', style: { flex: 1, bg: '#ddd' } }
  ]
});`,
  },
  {
    name: "Text",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'text',
  content: 'Beautiful text rendering at 120fps',
  style: { fontSize: 24, fontWeight: 'bold' }
});`,
  },
  {
    name: "Wrapping",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'text',
  content: 'This is a long text that will wrap automatically when it reaches the container edge',
  style: { maxWidth: 300, wrap: true }
});`,
  },
  {
    name: "Monospaced",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'text',
  content: 'console.log("Hello World");',
  style: { fontFamily: 'monospace', fontSize: 14 }
});`,
  },
  {
    name: "Emoji",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'text',
  content: '⚘ Native emoji rendering',
  style: { fontSize: 32 }
});`,
  },
  {
    name: "Underlined",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'text',
  content: 'Underlined text',
  style: { textDecoration: 'underline', color: '#ff6b35' }
});`,
  },
  {
    name: "Group Styles",
    code: `import { Glade } from 'glade';

const app = new Glade();

const groupStyle = { padding: 10, border: '1px solid #ccc' };

app.render({
  type: 'div',
  style: groupStyle,
  children: [
    { type: 'text', content: 'Grouped element 1' },
    { type: 'text', content: 'Grouped element 2' }
  ]
});`,
  },
  {
    name: "Separator",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'div',
  children: [
    { type: 'text', content: 'Section 1' },
    { type: 'separator', style: { height: 1, bg: '#ccc' } },
    { type: 'text', content: 'Section 2' }
  ]
});`,
  },
  {
    name: "Icon",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'icon',
  name: 'settings',
  size: 24,
  color: '#ff6b35'
});`,
  },
  {
    name: "Link",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'link',
  href: 'https://example.com',
  children: [
    { type: 'text', content: 'Click me!' }
  ]
});`,
  },
  {
    name: "Controls",
    code: `import { Glade } from 'glade';

const app = new Glade();

let checked = false;

app.render({
  type: 'checkbox',
  checked,
  onChange: (value) => { checked = value; }
});`,
  },
  {
    name: "Tabs",
    code: `import { Glade } from 'glade';

const app = new Glade();

let activeTab = 'home';

app.render({
  type: 'tabs',
  active: activeTab,
  tabs: ['home', 'profile', 'settings'],
  onChange: (tab) => { activeTab = tab; }
});`,
  },
  {
    name: "Tooltip",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'button',
  tooltip: 'Click to submit',
  children: [
    { type: 'text', content: 'Submit' }
  ]
});`,
  },
  {
    name: "Popover",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'popover',
  trigger: { type: 'button', content: 'Open' },
  content: {
    type: 'div',
    children: [{ type: 'text', content: 'Popover content' }]
  }
});`,
  },
  {
    name: "Dropdown",
    code: `import { Glade } from 'glade';

const app = new Glade();

let selected = 'option1';

app.render({
  type: 'dropdown',
  options: ['option1', 'option2', 'option3'],
  selected,
  onChange: (value) => { selected = value; }
});`,
  },
  {
    name: "Grid",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'grid',
  columns: 3,
  gap: 10,
  children: Array(9).fill(null).map(() => ({
    type: 'div',
    style: { bg: '#f0f0f0', height: 100 }
  }))
});`,
  },
  {
    name: "Flexbox",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'flex',
  direction: 'row',
  justify: 'space-between',
  align: 'center',
  children: [
    { type: 'div', content: 'Start' },
    { type: 'div', content: 'Center' },
    { type: 'div', content: 'End' }
  ]
});`,
  },
  {
    name: "Canvas",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'canvas',
  width: 400,
  height: 300,
  onRender: (ctx) => {
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(50, 50, 100, 100);
  }
});`,
  },
  {
    name: "Vectors",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'svg',
  width: 200,
  height: 200,
  children: [
    { type: 'circle', cx: 100, cy: 100, r: 50, fill: '#ff6b35' }
  ]
});`,
  },
  {
    name: "Images",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'image',
  src: '/path/to/image.png',
  width: 300,
  height: 200,
  fit: 'cover'
});`,
  },
  {
    name: "Scrolling",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'scroll',
  height: 300,
  children: Array(50).fill(null).map((_, i) => ({
    type: 'text',
    content: \`Item \${i + 1}\`
  }))
});`,
  },
  {
    name: "Virtual Scrolling",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'virtualScroll',
  itemCount: 10000,
  itemHeight: 30,
  renderItem: (index) => ({
    type: 'text',
    content: \`Item \${index + 1}\`
  })
});`,
  },
  {
    name: "Scrollbars",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'scroll',
  scrollbar: {
    width: 8,
    color: '#ff6b35',
    radius: 4
  },
  children: [/* content */]
});`,
  },
  {
    name: "SVGs",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'svg',
  path: 'M10 10 L90 90 L10 90 Z',
  fill: '#ff6b35',
  stroke: '#000',
  strokeWidth: 2
});`,
  },
  {
    name: "Focus",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'input',
  placeholder: 'Focus me',
  onFocus: () => console.log('Focused!'),
  onBlur: () => console.log('Blurred!')
});`,
  },
  {
    name: "Clipboard",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'button',
  onClick: () => {
    app.clipboard.writeText('Copied to clipboard!');
  },
  children: [{ type: 'text', content: 'Copy' }]
});`,
  },
  {
    name: "Text Selection",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'text',
  content: 'Select this text',
  selectable: true,
  onSelect: (text) => console.log('Selected:', text)
});`,
  },
  {
    name: "X-Element Selection",
    code: `import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'div',
  selectable: true,
  onSelect: () => console.log('Element selected'),
  children: [{ type: 'text', content: 'Click to select' }]
});`,
  },
];

export default function App() {
  const [selectedDemo, setSelectedDemo] = useState("Padding");
  const [selectedGladeDemo, setSelectedGladeDemo] = useState(ALL_DEMOS[0]?.name ?? "Button");

  const currentDemo =
    componentDemos.find((demo) => demo.name === selectedDemo) ?? componentDemos[0]!;

  return (
    <div className="min-h-screen bg-[#f5f5f4]">
      <Header />
      <div className="flex min-h-screen flex-col p-2">
        <div className="mx-auto flex w-full max-w-270 flex-col py-8">
          <div
            className="rounded bg-white px-4 pb-36 pt-16 lg:pt-28"
            style={{
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            }}
          >
            <div className="mx-auto flex max-w-200 flex-col gap-8 pt-2">
              <div className="flex flex-col gap-8">
                <Hero />

                <div className="flex flex-col gap-16">
                  <hr className="mt-1 bg-gray-300" />

                  <section id="features" className="scroll-mt-24 flex flex-col gap-6">
                    <SectionTag>Highlights</SectionTag>
                    <h2 className="-mt-4 mb-4">Glade Features</h2>
                    <p className="text-gray-600">
                      Here are some cool things about Glade. (Or at least things that were hard to
                      build.)
                    </p>
                    <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">01</span>
                        <h4 className="text-lg font-medium">Typescript (mostly)</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Uses WASM for layouts, font rendering, glyphs and SVGs. Everything else is
                          TypeScript.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">02</span>
                        <h4 className="text-lg font-medium">Cross platform</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Runs on macOS and web. Write your Typescript once, and it'll run on a
                          browser or macOS with no modifications.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">03</span>
                        <h4 className="text-lg font-medium">Native WebGPU</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Uses Google's Dawn implementation of WebGPU when building for native.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">04</span>
                        <h4 className="text-lg font-medium">Static Binary Builds</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Compiles JS to single statically executable binary using Bun's FFI and
                          file embedding.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">05</span>
                        <h4 className="text-lg font-medium">Font Rendering</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Full-featured font rendering using rustybuzz (Rust impl of harfbuzz) for
                          full TTF rendering.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">06</span>
                        <h4 className="text-lg font-medium">Emoji Support</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Uses Noto Color Emoji by default, but you can use whatever full-color
                          emoji font you'd like. Supports font fallbacks for missing characters.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">07</span>
                        <h4 className="text-lg font-medium">Elements & Components</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Elements like divs, text, and links. Also buttons, tooltips, tabs,
                          scrollbars, dialogs, images, checkboxes, radios, toggles, and more.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">08</span>
                        <h4 className="text-lg font-medium">Tailwind-ish Styling</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Style elements and components using Tailwind-like utilities directly on
                          the elements and components.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">09</span>
                        <h4 className="text-lg font-medium">Text Features</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Text editing works out of the box. Cross-element selection, text input,
                          range selection, select-all, and copy-and-paste via clipboard APIs.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">10</span>
                        <h4 className="text-lg font-medium">SVG</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Renders SVGs fairly well, as far as I can tell. Vector graphics support
                          for scalable, crisp visuals at any resolution.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">11</span>
                        <h4 className="text-lg font-medium">Flexbox & Grids</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Full flexbox support, and CSS-grid-like features via the Taffy library.
                        </p>
                      </div>
                      <div className="col-span-1 flex flex-col gap-2">
                        <span className="font-mono text-lg text-orange-500">12</span>
                        <h4 className="text-lg font-medium">Custom Cursors</h4>
                        <p className="text-base leading-relaxed text-gray-600">
                          Pointers, text, default, and more. Basically, anything you can do with
                          Tailwind's cursor classes.
                        </p>
                      </div>
                    </div>
                    <hr className="mt-10 bg-gray-300" />
                  </section>

                  <section id="readme" className="scroll-mt-24 flex flex-col gap-6">
                    <SectionTag>PREAMBLE</SectionTag>
                    <h2 className="-mt-4 mb-4">README.md</h2>
                    <h3>Here's how Glade was built and how it works</h3>
                    <p className="text-gray-600">
                      I started building this basically because I thought Bun's FFI feature was
                      really cool. You can link against dynamic libraries and compile JavaScript
                      into a single executable given a target host OS and architecture. On top of
                      that, you can use Bun's embedded file system so that you can actually put the
                      dynamically linked libraries inside of the static binary. Combining these two
                      things give you a lot of power, and I started to play around with it.
                    </p>
                    <p className="text-gray-600">
                      At first I was using OpenGL and WebGL for basic graphics programming. So you
                      could work around in OpenGL2, which is mostly, you know, WebGL. And write the
                      exact same code that would run natively when building for an operating system
                      as it would if you're compiling it for the browser.
                    </p>
                    <p className="text-gray-600">
                      Then I started to use WebGPU, which in the browser is fairly easy, but a
                      little bit trickier for native. I actually found that it wasn't a huge amount
                      of work, though, to set up Google's Dawn implementation of the WebGPU spec,
                      which lets me pre-build the Dawn library, dynamically linked library, and then
                      link against that for native deployments, and then basically wrap the native
                      and browser versions of my code base with those different versions of WebGPU.
                      So you can write the exact same code and have it run natively or in the
                      browser.
                    </p>
                    <DiagramPlaceholder />
                    <p className="text-gray-600">
                      You'll notice that so far I haven't really mentioned whether this is
                      production ready. It's not production ready. This is just something I was
                      goofing around with to see if I could do it. And it's been a lot of fun.
                    </p>
                    <p className="text-gray-600">
                      Once I got the basics working and had a sort of you know multicolor triangle
                      rendering I started to consider the abstractions that you'd need or rather the
                      interface you'd need to conform to on a browser or a native environment in
                      order to provide the minimum functionality. Things like keyboard input events,
                      mouse events, window events, and resize events, those sorts of things.
                    </p>
                    <DiagramPlaceholder />
                    <p className="text-gray-600">
                      On the browser, these are fairly normal and standard, and I was just able to
                      patch in, you know, document resize listener for window resize, for example.
                    </p>
                    <p className="text-gray-600">
                      For native, I actually used GLFW, which is a GL for Windows, I think it stands
                      for. It basically lets you start up a window in Windows, Linux, or Mac OS X,
                      and have a render loop that you can use to respond to keyboard events and
                      mouse events and window resizes and that sort of thing. And then it just gives
                      you a surface upon which you can do OpenGL or WebGL, or in our case, WebGPU
                      interactions.
                    </p>
                    <p className="text-gray-600">
                      So I was able to write a minimal interface for these interactions, these
                      events, and then inside of two different packages, write the implementation of
                      those in the web, you know, just responding to normal browser events and in
                      native responding to GLFW events, and pushing those through the render loop
                      and having the same render loop work for both platforms.
                    </p>
                    <p className="text-gray-600">
                      With that in place, I started working on how we would do the normal graphical
                      user interface things like layouts for starters, drawing rectangles, drawing
                      rounded rectangles, drawing borders, doing padding, doing margins, doing
                      flexbox layouts, and CSS grid like layouts, and doing font rendering,
                      including all of the glyph caching and font layout stuff, and rendering
                      emojis, and drawing shapes with like a raw canvas API and parsing SVGs and
                      rendering SVGs, parentheses mostly. These are all the basic building blocks
                      that you need in order to build the higher level components like text input or
                      toggles or switches or radio checkboxes or drop downs and tool tips and
                      buttons and so on and so forth. But in order to get all these things working,
                      you first have to have some idea of how you're going to handle your render
                      cycle. I roughly model my render cycle based upon Z GPU Rust library that they
                      use for the Zed text editor. And this served me pretty well.
                    </p>
                    <ImagePlaceholder />
                    <span className="text-sm text-gray-800 italic">
                      <span className="text-black font-medium">†</span> Glade is a backronym for{" "}
                      <strong>GL-assisted Drawing environment</strong>, which seemed like a fun name
                      when I started this project, because it originally used WebGL/OpenGL. It now
                      uses WebGPU, but I like the name, so I'm keeping it.
                    </span>
                    <hr className="mt-10 bg-gray-300" />
                  </section>

                  <section id="getting-started" className="scroll-mt-24 flex flex-col gap-6">
                    <SectionTag>TL;DR</SectionTag>
                    <h2 className="-mt-4 mb-4">Start Here</h2>
                    <h3>Quick installation and setup guide</h3>

                    <p className="text-gray-600">
                      <span className="font-mono text-orange-500">01</span> Add Glade as a Git
                      dependency in your{" "}
                      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">
                        package.json
                      </code>
                      . Note that Glade is not available on the npm package manager.
                    </p>

                    <pre className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                      <code className="text-xs font-mono">{`{
  "dependencies": {
    "glade": "git+https://github.com/vogtb/glade.git"
  }
}`}</code>
                    </pre>

                    <p className="text-gray-600">
                      <span className="font-mono text-orange-500">02</span> Make sure you have Bun
                      installed. Glade requires Bun for FFI support and compilation.
                    </p>

                    <p className="text-gray-600">
                      <span className="font-mono text-orange-500">03</span> Create a basic Glade
                      application. Here's a simple example with a flexbox layout:
                    </p>

                    <pre className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                      <code className="text-xs font-mono">{`import { Glade } from 'glade';

const app = new Glade();

app.render({
  type: 'flex',
  direction: 'column',
  gap: 10,
  padding: 20,
  children: [
    { type: 'text', content: 'Welcome to Glade!' },
    { type: 'text', content: 'GPU-accelerated UI rendering' }
  ]
});`}</code>
                    </pre>

                    <p className="text-gray-600">
                      <span className="font-mono text-orange-500">04</span> Build your application
                      using Bun's compile command. You'll need to specify the destination binary,
                      target OS, and target architecture:
                    </p>

                    <pre className="bg-gray-50 rounded-lg p-3 overflow-x-auto">
                      <code className="text-xs font-mono">{`bun --compile ./app.ts --outfile ./dist/app --target=darwin-arm64`}</code>
                    </pre>

                    <ImagePlaceholder />
                    <span className="text-sm text-gray-600 italic -mt-4">
                      This is what you should see on screen if you're building for native.
                    </span>
                    <hr className="mt-10 bg-gray-300" />
                  </section>

                  <section id="core-concepts" className="scroll-mt-24 flex flex-col gap-6">
                    <SectionTag>Big Idea</SectionTag>
                    <h2 className="-mt-4 mb-4">Core Concepts</h2>

                    <SubSectionWithArrow>
                      <h3>Understanding the render cycle</h3>
                      <p className="text-gray-600 mt-2">
                        Glade's render cycle follows a predictable three-step process. First,
                        there's <strong>request layout</strong>, where the system calculates
                        dimensions and positions for all elements. Next comes{" "}
                        <strong>pre-paint</strong>, where preparations are made for rendering (like
                        setting up textures and GPU buffers). Finally, <strong>paint</strong>{" "}
                        executes the actual drawing to the screen. This cycle runs at up to 120fps,
                        ensuring smooth animations and interactions.
                      </p>
                    </SubSectionWithArrow>

                    <SubSectionWithArrow>
                      <h3>Component architecture and state</h3>
                      <p className="text-gray-600 mt-2">
                        All components in Glade have access to an app-level context, and updates are
                        handled through a broadcast observer pattern. When you register an event
                        handler—say, a click on a button or mouse movement—components automatically
                        subscribe to relevant state changes. When those changes occur, subscribers
                        are notified and re-render accordingly. Most of this is hidden from you as a
                        developer. You just register your event handlers, mutate state at the
                        component or app level, and Glade takes care of the rest.
                      </p>
                    </SubSectionWithArrow>

                    <SubSectionWithArrow>
                      <h3>Font rendering and embedding</h3>
                      <p className="text-gray-600 mt-2">
                        Glade currently embeds three fonts: Inter for sans-serif text, JetBrains
                        Mono for monospace, and Noto Color Emoji for emoji rendering. The system
                        first tries Inter or JetBrains Mono depending on your font family choice. If
                        a character isn't available in those fonts (like an emoji), it falls back to
                        Noto Color Emoji. This gives you clean, professional text with full emoji
                        support.
                      </p>
                      <p className="text-gray-600">
                        Because both fonts are currently embedded, WebAssembly builds are larger
                        than ideal. I'm planning to add dynamic font loading in the future. For
                        native builds, you'd continue embedding fonts (size is less of a concern,
                        and local loading is faster). For browser deployments, you could fetch fonts
                        asynchronously before starting your app, potentially using a smaller
                        embedded font for an initial loading state.
                      </p>
                    </SubSectionWithArrow>
                    <hr className="mt-10 bg-gray-300" />
                  </section>

                  <section id="app" className="scroll-mt-24 flex flex-col gap-6">
                    <SectionTag>Root</SectionTag>
                    <h2 className="-mt-4 mb-4">App</h2>
                    <h3>Application lifecycle and configuration</h3>
                    <p className="text-gray-600">
                      The App class is the entry point for every Glade application. It manages the
                      application lifecycle, handles window creation, and orchestrates the rendering
                      pipeline. Configure your app with themes, plugins, and custom settings.
                    </p>
                    <ImagePlaceholder />
                    <hr className="mt-10 bg-gray-300" />
                  </section>

                  <section id="components" className="scroll-mt-24 flex flex-col gap-6">
                    <SectionTag>{"Demo & Code"}</SectionTag>
                    <h2 className="-mt-4 mb-4">Components</h2>
                    <h3>Pre-built UI elements and layouts</h3>
                    <p className="text-gray-600">
                      Glade provides a rich set of pre-built components including buttons, inputs,
                      sliders, menus, and complex layouts. All components are fully customizable and
                      accessible by default, following modern design patterns.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {componentDemos.map((demo) => (
                        <ComponentDemoButton
                          key={demo.name}
                          title={demo.name}
                          isActive={selectedDemo === demo.name}
                          onClick={() => setSelectedDemo(demo.name)}
                        />
                      ))}
                    </div>
                    <LiveDemo code={currentDemo.code} selectedDemo={selectedDemo} />
                    <hr className="mt-10 bg-gray-300" />
                  </section>

                  <section id="demos" className="scroll-mt-24 flex flex-col gap-6">
                    <SectionTag>Examples</SectionTag>
                    <h2 className="-mt-4 mb-4">Full Demos</h2>
                    <h3>Interactive Glade component demos</h3>
                    <p className="text-gray-600">
                      Explore interactive examples showcasing Glade's capabilities. These demos run
                      in real-time using WebGPU, demonstrating best practices and the full power of
                      the library.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_DEMOS.map((demo) => (
                        <ComponentDemoButton
                          key={demo.name}
                          title={demo.name}
                          isActive={selectedGladeDemo === demo.name}
                          onClick={() => setSelectedGladeDemo(demo.name)}
                        />
                      ))}
                    </div>
                    <div className="w-full flex justify-center">
                      <DemoShowcase demoName={selectedGladeDemo} width={700} height={500} />
                    </div>
                    <hr className="mt-10 bg-gray-300" />
                  </section>

                  <section id="faq" className="scroll-mt-24 flex flex-col gap-6">
                    <SectionTag>FAQ</SectionTag>
                    <h2 className="-mt-4 mb-4">Frequently Asked Questions</h2>

                    <h3>Is Glade production-ready?</h3>
                    <p className="text-gray-600">
                      No. No, it is not. I built this mostly as a way to learn about WebGPU, GUIs,
                      graphics programming, and how different rendering modes and painting
                      lifecycles for UIs work. That being said, with a small team of engineers
                      knowledgeable in graphics programming, you could probably get this production
                      ready in about two and a half weeks.
                    </p>

                    <h3>Is Glade actively maintained?</h3>
                    <p className="text-gray-600">
                      Not really. I plan on updating it here and there and generally trying to
                      improve it, but I'm not putting a significant amount of time or effort into
                      this library. If you have a change, please go ahead and feel free to submit a
                      PR and email me at <a href="mailto:benjvogt@gmail.com">benjvogt@gmail.com</a>.
                      I'll try my best to take a look at it.
                    </p>

                    <h3>Do I have to use Bun?</h3>
                    <p className="text-gray-600">
                      At the moment, yes. While I could author the FFI and dynamically linked
                      libraries as Node modules, it's more work than the current Bun setup. Also,
                      when it comes to embedding, Bun makes it way easier than Node does. At the
                      moment I'm not really interested in rewriting this whole thing just so I can
                      accommodate Node. Bun seems to work pretty well, and I like it.
                    </p>

                    <h3>Does Glade support Apple emojis?</h3>
                    <p className="text-gray-600">
                      Technically, yes. I've actually tried this and have been able to embed the
                      Apple emoji TTF file, and it renders perfectly. However, that is a 200
                      megabyte file, which is challenging to embed or load in a web deployment or a
                      native deployment. And more importantly, that is a copyrighted file. The way
                      Apple does it, their custom renderer will actually fetch individual PNGs and
                      render them on the frontend. So they're sort of getting around this and doing
                      it efficiently and maybe a little bit legally nebulously. But it is possible.
                      If you want to do that, that's up to you.
                    </p>

                    <h3>Does Glade support Windows or Linux?</h3>
                    <p className="text-gray-600">
                      At the moment, no. But GLFW and Dawn both support Windows and Linux, so it
                      really wouldn't be a significant amount of work to add packages like we do
                      with macOS and simply implement the interface for event handling, window
                      handling, and all of the other native functions like clipboard and text
                      selection. The reason I didn't do that is just because it's a lot of work and
                      I don't have a Windows machine, and it's actually a significant amount of
                      scaffolding to set up to even test that out.
                    </p>

                    <h3>Why did you choose WebGPU?</h3>
                    <p className="text-gray-600">
                      Initially I worked with OpenGL/WebGL. But WebGPU has come a long way and has a
                      lot of interesting features. And it's a little bit easier to use, in my
                      opinion. That being said, there's really nothing specific at the application
                      level or component level that requires WebGPU. So in theory, if we wanted to
                      in the future, we could swap out the macOS platform implementation with Metal
                      or something like that, and then only use WebGPU for the browser. This would
                      create perhaps a larger surface area for the platform interface, which we
                      would have to implement on those respective platforms (native and web), but
                      it's certainly possible. Writing native shader code in Metal or WebGPU or
                      OpenGL or whatever you'd like to use for Windows and Linux is definitely
                      possible, and there's an increasing number of GUI libraries that do this. But
                      it seemed a little challenging for a first pass or a first attempt at this
                      library.
                    </p>

                    <h3>Have you built any applications with this library?</h3>
                    <p className="text-gray-600">
                      No. I've mostly been working through the components and elements, trying them
                      out as I go. Again, this is not really production ready.
                    </p>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
