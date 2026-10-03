"use client";

import { useEffect } from "react";

export default function MobileViewport() {
  useEffect(() => {
    function preventGesture(event: Event) {
      if (event.cancelable) event.preventDefault();
    }
    function preventPinch(event: TouchEvent) {
      if (event.touches.length > 1) preventGesture(event);
    }
    function preventDoubleTap(event: MouseEvent) {
      if (window.matchMedia("(pointer: coarse)").matches) preventGesture(event);
    }
    document.addEventListener("touchstart", preventPinch, { passive: false });
    document.addEventListener("touchmove", preventPinch, { passive: false });
    document.addEventListener("gesturestart", preventGesture, {
      passive: false,
    });
    document.addEventListener("gesturechange", preventGesture, {
      passive: false,
    });
    document.addEventListener("dblclick", preventDoubleTap);
    return () => {
      document.removeEventListener("touchstart", preventPinch);
      document.removeEventListener("touchmove", preventPinch);
      document.removeEventListener("gesturestart", preventGesture);
      document.removeEventListener("gesturechange", preventGesture);
      document.removeEventListener("dblclick", preventDoubleTap);
    };
  }, []);
  return null;
}
