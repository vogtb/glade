import { FlashElement } from "@glade/flash";

export type Demo<T extends FlashElement<unknown, unknown> = FlashElement<unknown, unknown>> = {
  name: string;
  renderElement: () => T;
};
