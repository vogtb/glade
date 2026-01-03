import { div, text, uniformList, list } from "@glade/glade";
import { colors } from "@glade/utils";
import type { Demo, DemoItem } from "./demo";
import { SPACER_10PX } from "./common";

export const VIRTUAL_SCROLLING_DEMO: Demo = {
  name: "Virtual Scrolling",
  renderElement: (cx, state): DemoItem[] => [
    text("Efficient rendering of large lists with fixed and variable height items"),
    SPACER_10PX,
    div()
      .flex()
      .flexRow()
      .gap(16)
      .h(400)
      .children(
        div()
          .flex()
          .flexCol()
          .flex1()
          .gap(8)
          .children(
            text("UniformList (1000 items, 40px each)").size(13),
            uniformList<number>((item, props, _cx) =>
              div()
                .h(36)
                .px(12)
                .bg(props.index % 2 === 0 ? colors.black.x800 : colors.black.x900)
                .rounded(4)
                .flex()
                .itemsCenter()
                .justifyBetween()
                .children(
                  text(`Item ${item}`).size(13).color(colors.black.x200),
                  text(`#${props.index}`).font("JetBrains Mono").size(11).color(colors.black.x500)
                )
            )
              .data(Array.from({ length: 1000 }, (_, i) => i + 1))
              .itemSize(40)
              .setOverdraw(3)
              .trackScroll(state.uniformListScrollHandle!)
              .setContext(cx)
              .flex1()
              .bg(colors.black.x950)
              .rounded(8)
              .p(4)
          ),
        div()
          .flex()
          .flexCol()
          .flex1()
          .gap(8)
          .children(
            text("List (500 items, variable height)").size(13),
            list<{ id: number; lines: number }>(
              (item, props, _cx) =>
                div()
                  .hMin(30)
                  .px(12)
                  .py(8)
                  .bg(props.index % 2 === 0 ? colors.green.x900 : colors.green.x950)
                  .rounded(4)
                  .flex()
                  .flexCol()
                  .gap(4)
                  .children(
                    div()
                      .flex()
                      .flexRow()
                      .justifyBetween()
                      .children(
                        text(`Message ${item.id}`).size(13).color(colors.green.x200),
                        text(`${item.lines} line${item.lines > 1 ? "s" : ""}`)
                          .font("JetBrains Mono")
                          .size(10)
                          .color(colors.green.x500)
                      ),
                    ...Array.from({ length: item.lines }, (_, i) =>
                      text(`Line ${i + 1} of content for message ${item.id}`)
                        .size(11)
                        .color(colors.green.x400)
                    )
                  ),
              state.variableListState!
            )
              .data(
                Array.from({ length: 500 }, (_, i) => ({
                  id: i + 1,
                  lines: 1 + (i % 4),
                }))
              )
              .estimatedItemHeight(60)
              .setOverdraw(3)
              .setContext(cx)
              .flex1()
              .bg(colors.green.x950)
              .rounded(8)
              .p(4)
          )
      ),
  ],
};
