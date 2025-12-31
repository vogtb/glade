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

  focusPrimaryHandle: FocusHandle | null;
  focusSecondaryHandle: FocusHandle | null;
  focusDangerHandle: FocusHandle | null;
  toolbarHandles: FocusHandle[];
  toolbarContainerHandle: FocusHandle | null;
  modalTriggerHandle: FocusHandle | null;
  modalPrimaryHandle: FocusHandle | null;
  modalCloseHandle: FocusHandle | null;
  focusLog: string;
  focusModalOpen: boolean;
  setFocusLog: (log: string) => void;
  setFocusModalOpen: (open: boolean) => void;
};

export type Demo<T extends DemoItem = DemoItem> = {
  name: string;
  renderElement: (cx: FlashViewContext<FlashView>, state: DemoState) => T[];
};
