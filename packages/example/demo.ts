import type { FlashElement, FlashView, FlashViewContext } from "@glade/flash";

export type DemoItem = FlashElement<unknown, unknown>;

export type Demo<T extends DemoItem = DemoItem> = {
  name: string;
  renderElement: (cx: FlashViewContext<FlashView>) => T[];
};
