import type { FlashElement, FlashView, FlashViewContext } from "@glade/flash";

export type Demo<T extends FlashElement<unknown, unknown> = FlashElement<unknown, unknown>> = {
  name: string;
  renderElement: (cx: FlashViewContext<FlashView>) => T;
};
