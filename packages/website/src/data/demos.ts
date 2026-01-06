export type ComponentDemo = {
  name: string;
  code: string;
};

export const componentDemos: ComponentDemo[] = [
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
