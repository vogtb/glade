// Window-specific and view-specific helpers for macOS.
#import <Cocoa/Cocoa.h>

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
