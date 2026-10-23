"use client";

export function showRouteTransition() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("route-transition:show"));
}
