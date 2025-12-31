import type {
  FlashElement,
  FlashView,
  FlashViewContext,
  FocusHandle,
  TextInputController,
} from "@glade/flash";

export type DemoItem = FlashElement<unknown, unknown>;

export type DemoState = {
  textInputHandle: FocusHandle | null;
  textInputController: TextInputController | null;
  textInputStatus: string;
  setTextInputStatus: (status: string) => void;
};

export type Demo<T extends DemoItem = DemoItem> = {
  name: string;
  renderElement: (cx: FlashViewContext<FlashView>, state: DemoState) => T[];
};
