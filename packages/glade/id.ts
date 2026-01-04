// Branded types for type-safe IDs
declare const __entityIdBrand: unique symbol;
export type EntityId = number & { [__entityIdBrand]: true };

declare const __windowIdBrand: unique symbol;
export type WindowId = number & { [__windowIdBrand]: true };

declare const __focusIdBrand: unique symbol;
export type FocusId = number & { [__focusIdBrand]: true };

declare const __scrollHandleIdBrand: unique symbol;
export type ScrollHandleId = number & { [__scrollHandleIdBrand]: true };
