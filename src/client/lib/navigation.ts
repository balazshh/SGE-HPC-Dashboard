export const CLIENT_NAVIGATION_EVENT = "client-navigation";

export function navigate(href: string, { replace = false } = {}) {
  window.history[replace ? "replaceState" : "pushState"](null, "", href);
  window.dispatchEvent(new Event(CLIENT_NAVIGATION_EVENT));
  window.scrollTo(0, 0);
  window.requestAnimationFrame(() => document.getElementById("main-content")?.focus());
}
