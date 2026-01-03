import type {
  GladeElement,
  GladeView,
  GladeViewContext,
  FocusHandle,
  ListState,
  ScrollHandle,
  TextInputController,
} from "@glade/glade";

export type DemoItem = GladeElement<unknown, unknown>;

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

  checkboxChecked: boolean;
  checkboxIndeterminate: boolean;
  setCheckboxChecked: (checked: boolean) => void;
  setCheckboxIndeterminate: (indeterminate: boolean) => void;

  radioValue: string;
  setRadioValue: (value: string) => void;

  switchEnabled: boolean;
  notificationsEnabled: boolean;
  darkModeEnabled: boolean;
  setSwitchEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setDarkModeEnabled: (enabled: boolean) => void;

  dropdownOpen: boolean;
  dropdown2Open: boolean;
  dropdown3Open: boolean;
  dropdown4Open: boolean;
  dropdownLastAction: string;
  setDropdownOpen: (open: boolean) => void;
  setDropdown2Open: (open: boolean) => void;
  setDropdown3Open: (open: boolean) => void;
  setDropdown4Open: (open: boolean) => void;
  setDropdownLastAction: (action: string) => void;

  useSystemTheme: boolean;
  preferDarkMode: boolean;
  setUseSystemTheme: (use: boolean) => void;
  setPreferDarkMode: (dark: boolean) => void;
};

export type Demo<T extends DemoItem = DemoItem> = {
  name: string;
  renderElement: (cx: GladeViewContext<GladeView>, state: DemoState) => T[];
};
