//! macOS native X1/X2 mouse-button navigation (lifted from the engineer-assist
//! prototype, generalized over the runtime).
//!
//! Unlike Windows (WebView2) and Linux (WebKitGTK), macOS WKWebView does not
//! surface the X1/X2 ("back"/"forward") mouse buttons to the DOM, so a DOM
//! `mouseup` listener never fires. We install a process-level NSEvent monitor
//! that runs inside `-[NSApplication sendEvent:]` before the event reaches a
//! window, translate it to a `mouse-nav` Tauri event (`"back"` / `"forward"`),
//! and swallow the original (return null) so it never reaches the webview. The
//! frame's `useMouseNavigation` hook listens for that event.

use std::ptr::NonNull;
use std::sync::{Arc, Mutex};
use std::time::Instant;

use block2::RcBlock;
use objc2_app_kit::{NSEvent, NSEventMask};
use tauri::{AppHandle, Emitter, Runtime};

/// Install the NSEvent monitor for `app`. Call once during plugin setup.
///
/// macOS routes the X1/X2 buttons through several paths depending on mouse and
/// driver; we handle each:
/// - `NSEventTypeSwipe` (HID AC_Back/AC_Forward, e.g. MX Master 3): `deltaX`
///   `+1` = back, `-1` = forward, fired multiple times per press (hence debounce).
/// - `NSEventTypeSystemDefined` subtype 7 (`NX_SUBTYPE_AUX_MOUSE_BUTTONS`):
///   `data1 = (1 << buttonNumber)`, non-zero `data2` on press.
/// - `NSEventTypeOtherMouseDown` button 3/4: standard mouse-button path.
pub fn install<R: Runtime>(app: AppHandle<R>) {
    let mask = NSEventMask::Swipe
        | NSEventMask::OtherMouseDown
        | NSEventMask::OtherMouseUp
        | NSEventMask::SystemDefined;

    const X1_BACK_BIT: isize = 1 << 3; // buttonNumber 3
    const X2_FWD_BIT: isize = 1 << 4; // buttonNumber 4

    let last_emit: Arc<Mutex<Option<Instant>>> = Arc::new(Mutex::new(None));

    let emit_once = move |payload: &'static str| {
        let app = app.clone();
        let last = last_emit.clone();
        move || {
            let mut guard = last.lock().expect("mouse-nav debounce mutex");
            let now = Instant::now();
            let fresh = guard.map_or(true, |t| now.duration_since(t).as_millis() > 200);
            if fresh {
                let _ = app.emit("mouse-nav", payload);
                *guard = Some(now);
            }
        }
    };
    let emit_back = emit_once("back");
    let emit_forward = emit_once("forward");

    let block = RcBlock::new(move |event: NonNull<NSEvent>| -> *mut NSEvent {
        let ev = unsafe { event.as_ref() };

        match ev.r#type().0 {
            // SystemDefined subtype 7 — standard HID mouse-button path
            14 => {
                if ev.subtype().0 == 7 {
                    let action = match ev.data1() {
                        X1_BACK_BIT => Some(false), // back
                        X2_FWD_BIT => Some(true),   // forward
                        _ => None,
                    };
                    if let Some(is_forward) = action {
                        if ev.data2() != 0 {
                            if is_forward {
                                emit_forward()
                            } else {
                                emit_back()
                            }
                        }
                        return std::ptr::null_mut();
                    }
                }
            }
            // OtherMouseDown button 3/4 — standard mouse-button path
            25 => match ev.buttonNumber() {
                3 => {
                    emit_back();
                    return std::ptr::null_mut();
                }
                4 => {
                    emit_forward();
                    return std::ptr::null_mut();
                }
                _ => {}
            },
            // OtherMouseUp — swallow the matching release for buttons 3/4
            26 => {
                if matches!(ev.buttonNumber(), 3 | 4) {
                    return std::ptr::null_mut();
                }
            }
            // Swipe — MX Master 3 path. deltaX = +1 back, -1 forward
            31 => {
                let dx = ev.deltaX();
                if dx > 0.5 {
                    emit_back();
                    return std::ptr::null_mut();
                } else if dx < -0.5 {
                    emit_forward();
                    return std::ptr::null_mut();
                }
                // dx == 0 is a phase event (Began/Ended) — pass through
            }
            _ => {}
        }
        event.as_ptr()
    });

    let registration = unsafe { NSEvent::addLocalMonitorForEventsMatchingMask_handler(mask, &block) };

    // The monitor must outlive this function; leak the block and registration so
    // they persist for the lifetime of the app.
    std::mem::forget(block);
    std::mem::forget(registration);
}
