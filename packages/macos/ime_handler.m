// NOTE: This Objective-C shim is required for IME support because the
// NSTextInputClient methods return NSRange/NSRect by value. The macOS text
// system calls these selectors with a struct-return ABI that Bun FFI/objc.ts
// cannot express today (no struct return support). We cannot "return a pointer"
// or serialize the struct because the caller expects a by-value struct in the
// exact method signature. Until Bun FFI gains struct return support, this
// native file must exist.
#import <Cocoa/Cocoa.h>

typedef void (*ImeComposingCallback)(const char *text, int selectionStart, int selectionEnd, void *userData);
typedef void (*ImeCommitCallback)(const char *text, void *userData);
typedef void (*ImeCancelCallback)(void *userData);

@interface IMEHandler : NSView <NSTextInputClient>

@property (nonatomic, assign) ImeComposingCallback onComposing;
@property (nonatomic, assign) ImeCommitCallback onCommit;
@property (nonatomic, assign) ImeCancelCallback onCancel;
@property (nonatomic, assign) void *userData;

@property (nonatomic, weak) NSView *originalContentView;
@property (nonatomic, copy) NSString *markedText;
@property (nonatomic, assign) NSRange markedRange;
@property (nonatomic, assign) NSRange selectedRange;

- (instancetype)initWithFrame:(NSRect)frame
           originalContentView:(NSView *)view
                  onComposing:(ImeComposingCallback)onComposing
                     onCommit:(ImeCommitCallback)onCommit
                     onCancel:(ImeCancelCallback)onCancel
                     userData:(void *)userData;
@end

@implementation IMEHandler

- (instancetype)initWithFrame:(NSRect)frame
           originalContentView:(NSView *)view
                  onComposing:(ImeComposingCallback)onComposing
                     onCommit:(ImeCommitCallback)onCommit
                     onCancel:(ImeCancelCallback)onCancel
                     userData:(void *)userData {
  self = [super initWithFrame:frame];
  if (self) {
    _originalContentView = view;
    _markedText = @"";
    _markedRange = NSMakeRange(NSNotFound, 0);
    _selectedRange = NSMakeRange(0, 0);
    _onComposing = onComposing;
    _onCommit = onCommit;
    _onCancel = onCancel;
    _userData = userData;
  }
  return self;
}

- (BOOL)acceptsFirstResponder {
  return YES;
}

- (BOOL)canBecomeKeyView {
  return YES;
}

// Pass mouse events through to GLFW's view
- (NSView *)hitTest:(NSPoint)point {
  return _originalContentView;
}

- (void)keyDown:(NSEvent *)event {
  [self.inputContext handleEvent:event];
}

#pragma mark - NSTextInputClient

- (void)setMarkedText:(id)string
        selectedRange:(NSRange)selectedRange
     replacementRange:(NSRange)replacementRange {
  (void)replacementRange;
  NSString *text = [string isKindOfClass:[NSAttributedString class]] ? [(NSAttributedString *)string string]
                                                                     : (NSString *)string;

  if (text.length > 0) {
    self.markedText = text;
    self.markedRange = NSMakeRange(0, text.length);
    self.selectedRange = selectedRange;
    if (self.onComposing) {
      self.onComposing(text.UTF8String, (int)selectedRange.location, (int)(selectedRange.location + selectedRange.length), self.userData);
    }
  } else {
    self.markedText = @"";
    self.markedRange = NSMakeRange(NSNotFound, 0);
    self.selectedRange = NSMakeRange(0, 0);
  }
}

- (void)insertText:(id)string replacementRange:(NSRange)replacementRange {
  (void)replacementRange;
  NSString *text = [string isKindOfClass:[NSAttributedString class]] ? [(NSAttributedString *)string string]
                                                                     : (NSString *)string;

  self.markedText = @"";
  self.markedRange = NSMakeRange(NSNotFound, 0);
  self.selectedRange = NSMakeRange(0, 0);

  if (self.onCommit) {
    self.onCommit(text.UTF8String, self.userData);
  }
}

- (void)unmarkText {
  self.markedText = @"";
  self.markedRange = NSMakeRange(NSNotFound, 0);
  self.selectedRange = NSMakeRange(0, 0);
  if (self.onCancel) {
    self.onCancel(self.userData);
  }
}

- (BOOL)hasMarkedText {
  return self.markedText.length > 0;
}

- (NSRange)markedRange {
  return _markedRange;
}

- (NSRange)selectedRange {
  return _selectedRange;
}

- (NSRect)firstRectForCharacterRange:(NSRange)range actualRange:(NSRangePointer)actualRange {
  if (actualRange) {
    *actualRange = range;
  }
  NSRect rect = NSMakeRect(100, 100, 0, 20);
  return [self.window convertRectToScreen:[self convertRect:rect toView:nil]];
}

- (NSUInteger)characterIndexForPoint:(NSPoint)point {
  (void)point;
  return NSNotFound;
}

- (NSArray<NSAttributedStringKey> *)validAttributesForMarkedText {
  return @[];
}

- (NSAttributedString *)attributedSubstringForProposedRange:(NSRange)range
                                                actualRange:(NSRangePointer)actualRange {
  (void)range;
  if (actualRange) {
    *actualRange = NSMakeRange(NSNotFound, 0);
  }
  return nil;
}

@end

/**
 * Attach an IME handler to an NSWindow. Returns a retained pointer to the handler.
 */
void *ime_attach(void *nsWindowPtr,
                 ImeComposingCallback onComposing,
                 ImeCommitCallback onCommit,
                 ImeCancelCallback onCancel,
                 void *userData) {
  if (nsWindowPtr == NULL) {
    return NULL;
  }
  NSWindow *window = (__bridge NSWindow *)nsWindowPtr;
  IMEHandler *handler = [[IMEHandler alloc] initWithFrame:window.contentView.bounds
                                     originalContentView:window.contentView
                                            onComposing:onComposing
                                               onCommit:onCommit
                                               onCancel:onCancel
                                               userData:userData];
  [handler setAutoresizingMask:NSViewWidthSizable | NSViewHeightSizable];
  [window.contentView addSubview:handler];
  [window makeFirstResponder:handler];
  return (__bridge_retained void *)handler;
}

/**
 * Make the IME handler the first responder again (useful after focus changes).
 */
void ime_make_first_responder(void *handlerPtr) {
  if (handlerPtr == NULL) {
    return;
  }
  IMEHandler *handler = (__bridge IMEHandler *)handlerPtr;
  [handler.window makeFirstResponder:handler];
}

/**
 * Detach and release the IME handler.
 */
void ime_detach(void *handlerPtr) {
  if (handlerPtr == NULL) {
    return;
  }
  IMEHandler *handler = (__bridge_transfer IMEHandler *)handlerPtr;
  if (handler.superview) {
    [handler removeFromSuperview];
  }
}
