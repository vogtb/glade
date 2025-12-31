import type {
  FlashElement,
  FlashView,
  FlashViewContext,
  FocusHandle,
  ImageTile,
  ListState,
  ScrollHandle,
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

  scrollbarHandle1: ScrollHandle | null;
  scrollbarHandle2: ScrollHandle | null;
  scrollbarHandle3: ScrollHandle | null;

  uniformListScrollHandle: ScrollHandle | null;
  variableListScrollHandle: ScrollHandle | null;
  variableListState: ListState | null;

  clipboardLastText: string | null;
  clipboardStatus: string;
  clipboardSample: string;
  setClipboardLastText: (text: string | null) => void;
  setClipboardStatus: (status: string) => void;

  selectedWebGPUDemo: "hexagon" | "metaball" | "particle" | "raymarch" | "terrain" | "galaxy";
  setSelectedWebGPUDemo: (
    demo: "hexagon" | "metaball" | "particle" | "raymarch" | "terrain" | "galaxy"
  ) => void;

  pngImageTile: ImageTile | null;
  jpgImageTile: ImageTile | null;
};

export type Demo<T extends DemoItem = DemoItem> = {
  name: string;
  renderElement: (cx: FlashViewContext<FlashView>, state: DemoState) => T[];
};
