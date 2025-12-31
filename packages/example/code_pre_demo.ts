import { code, div, pre, text } from "@glade/flash";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

const INLINE_SAMPLE =
  'const value    = input ?? defaultUser;\n\treturn value?.profile?.email ?? "missing";';

const PRE_SAMPLE = [
  "function renderRows(items: Array<{ name: string; value?: number }>) {",
  "\tconst rows = items.map((item, index) => ({",
  '\t\tlabel: `${index}: ${item.name}`.padEnd(18, " "),',
  '\t\tvalue: item.value ?? "n/a",',
  "\t}));",
  "\treturn rows;",
  "}",
  "",
  "// Tabs expand to 8-column stops; newlines are preserved.",
].join("\n");

const WRAPPED_PRE_SAMPLE =
  "GET /api/search?q=monospace%20demo&limit=25&cursor=eyJvZmZzZXQiOjE0NH0=&user-agent=glade-demo/1.0";

export const CODE_DEMO: Demo = {
  name: "Code & Pre",
  renderElement: (_cx, _state): DemoItem[] => [
    div()
      .flex()
      .flexCol()
      .gap(14)
      .children(
        text("Monospace helpers (code + pre)").font("Inter").size(16),
        text("Inline code collapses whitespace; preformatted blocks preserve whitespace and tabs.")
          .font("Inter")
          .size(15),
        div()
          .flex()
          .flexWrap()
          .gap(10)
          .children(
            text("Inline sample:").font("Inter").size(14),
            code(INLINE_SAMPLE).size(14),
            text("→ whitespace collapses and wraps").font("Inter").size(13)
          ),
        SPACER_10PX,
        text("Preformatted block (no wrap, scrollable)").font("Inter").size(16),
        SPACER_10PX,
        pre(PRE_SAMPLE).padding(12).rounded(8).wrap(false).scrollable(true),
        SPACER_10PX,
        text("Wrapped preformatted text (tabSize: 4)").font("Inter").size(16),
        SPACER_10PX,
        pre(WRAPPED_PRE_SAMPLE).wrap(true).tabSize(4).padding(12).rounded(8),
        SPACER_10PX,
        text("Custom font override (JetBrains Mono)").font("Inter").size(16),
        SPACER_10PX,
        div()
          .flex()
          .flexCol()
          .gap(6)
          .children(
            code("const ready = true;").font("JetBrains Mono").size(14),
            code("export type FlashTask = () => void;").font("JetBrains Mono").size(14)
          )
      ),
  ],
};
