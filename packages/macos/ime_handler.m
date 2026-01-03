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

@interface TitleBarDragView : NSView
@end

@implementation TitleBarDragView

- (BOOL)mouseDownCanMoveWindow {
  return YES;
}

- (BOOL)acceptsFirstMouse:(NSEvent *)event {
  (void)event;
  return YES;
}

- (void)mouseDown:(NSEvent *)event {
  [self.window performWindowDragWithEvent:event];
}

@end

@interface TitleBarDragMonitor : NSObject

@property (nonatomic, weak) NSWindow *window;
@property (nonatomic, assign) CGFloat height;
@property (nonatomic, strong) id monitor;
@property (nonatomic, strong) NSEvent *pendingMouseDown;

- (instancetype)initWithWindow:(NSWindow *)window height:(CGFloat)height;
- (void)detach;

@end

@implementation TitleBarDragMonitor

- (instancetype)initWithWindow:(NSWindow *)window height:(CGFloat)height {
  self = [super init];
  if (self) {
    _window = window;
    _height = height;
  }
  return self;
}

- (BOOL)isInDragRegion:(NSEvent *)event {
  if (!self.window) {
    return NO;
  }
  NSPoint location = [event locationInWindow];
  CGFloat minY = NSHeight(self.window.frame) - self.height;
  return location.y >= minY;
}

- (void)attachMonitor {
  __weak TitleBarDragMonitor *weakSelf = self;
  self.monitor = [NSEvent addLocalMonitorForEventsMatchingMask:(NSEventMaskLeftMouseDown |
                                                               NSEventMaskLeftMouseDragged |
                                                               NSEventMaskLeftMouseUp)
                                                      handler:^NSEvent * _Nullable(NSEvent * _Nonnull event) {
    TitleBarDragMonitor *strongSelf = weakSelf;
    if (!strongSelf || !strongSelf.window) {
      return event;
    }

    if (![strongSelf isInDragRegion:event]) {
      if (event.type == NSEventTypeLeftMouseUp) {
        strongSelf.pendingMouseDown = nil;
      }
      return event;
    }

    if (event.type == NSEventTypeLeftMouseDown) {
      strongSelf.pendingMouseDown = event;
      return event;
    }

    if (event.type == NSEventTypeLeftMouseDragged && strongSelf.pendingMouseDown) {
      [strongSelf.window performWindowDragWithEvent:strongSelf.pendingMouseDown];
      strongSelf.pendingMouseDown = nil;
      return event;
    }

    if (event.type == NSEventTypeLeftMouseUp) {
      strongSelf.pendingMouseDown = nil;
    }

    return event;
  }];
}

- (void)detach {
  if (self.monitor) {
    [NSEvent removeMonitor:self.monitor];
    self.monitor = nil;
  }
  self.pendingMouseDown = nil;
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
 * Attach a draggable title bar overlay to an NSWindow. Returns a retained pointer to the view.
 */
void *titlebar_drag_attach(void *nsWindowPtr) {
  if (nsWindowPtr == NULL) {
    return NULL;
  }
  NSWindow *window = (__bridge NSWindow *)nsWindowPtr;
  NSView *contentView = window.contentView;
  if (contentView == nil) {
    return NULL;
  }

  NSRect contentBounds = contentView.bounds;
  NSRect frame = window.frame;
  NSRect layoutRect = window.contentLayoutRect;
  CGFloat titleBarHeight = NSHeight(frame) - NSMaxY(layoutRect);
  if (titleBarHeight <= 0) {
    titleBarHeight = 28;
  }
  NSRect dragFrame = NSMakeRect(0, NSHeight(contentBounds) - titleBarHeight, NSWidth(contentBounds), titleBarHeight);
  TitleBarDragView *dragView = [[TitleBarDragView alloc] initWithFrame:dragFrame];
  [dragView setAutoresizingMask:NSViewWidthSizable | NSViewMinYMargin];
  [contentView addSubview:dragView positioned:NSWindowAbove relativeTo:nil];
  return (__bridge_retained void *)dragView;
}

/**
 * Attach a drag monitor that allows clicks to pass through but drags the window on drag.
 */
void *titlebar_drag_monitor_attach(void *nsWindowPtr) {
  if (nsWindowPtr == NULL) {
    return NULL;
  }
  NSWindow *window = (__bridge NSWindow *)nsWindowPtr;
  NSRect frame = window.frame;
  NSRect layoutRect = window.contentLayoutRect;
  CGFloat titleBarHeight = NSHeight(frame) - NSMaxY(layoutRect);
  if (titleBarHeight <= 0) {
    titleBarHeight = 28;
  }

  TitleBarDragMonitor *monitor = [[TitleBarDragMonitor alloc] initWithWindow:window height:titleBarHeight];
  [monitor attachMonitor];
  return (__bridge_retained void *)monitor;
}

/**
 * Detach and release the draggable title bar overlay.
 */
void titlebar_drag_detach(void *dragViewPtr) {
  if (dragViewPtr == NULL) {
    return;
  }
  TitleBarDragView *dragView = (__bridge_transfer TitleBarDragView *)dragViewPtr;
  if (dragView.superview) {
    [dragView removeFromSuperview];
  }
}

/**
 * Detach and release the drag monitor.
 */
void titlebar_drag_monitor_detach(void *monitorPtr) {
  if (monitorPtr == NULL) {
    return;
  }
  TitleBarDragMonitor *monitor = (__bridge_transfer TitleBarDragMonitor *)monitorPtr;
  [monitor detach];
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
