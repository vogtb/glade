import { div, text, type FlashView, type FlashViewContext } from "@glade/flash";

export type Demo<T extends FlashView> = {
  name: string;
  view: T;
};

export class MainView implements FlashView {
  render(cx: FlashViewContext<this>) {
    const theme = cx.getTheme();
    const message = "Hello from Glade Example";

    return div()
      .flex()
      .itemsCenter()
      .justifyCenter()
      .w(cx.window.width)
      .h(cx.window.height)
      .bg(theme.surface)
      .child(text(message).font("Inter").size(24).color(theme.text));
  }
}
