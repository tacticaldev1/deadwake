import * as React from "react";

// Detects whether the current device is primarily touch-driven (phones,
// tablets) so we can show on-screen controls instead of relying on
// keyboard/mouse. Uses the pointer/hover media features (not viewport
// width) so it stays correct across screen sizes and orientation changes.
function detectTouchDevice() {
  if (typeof window === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const noHover = window.matchMedia?.("(hover: none)").matches ?? false;
  const hasTouchPoints = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  return hasTouchPoints && (coarsePointer || noHover);
}

export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = React.useState<boolean>(detectTouchDevice);

  React.useEffect(() => {
    const update = () => setIsTouch(detectTouchDevice());
    const pointerMql = window.matchMedia("(pointer: coarse)");
    const hoverMql = window.matchMedia("(hover: none)");
    pointerMql.addEventListener("change", update);
    hoverMql.addEventListener("change", update);
    window.addEventListener("orientationchange", update);
    update();
    return () => {
      pointerMql.removeEventListener("change", update);
      hoverMql.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isTouch;
}
