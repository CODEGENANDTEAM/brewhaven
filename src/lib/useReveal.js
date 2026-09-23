// Fades elements marked with data-reveal in as they scroll into view.
//
// The hiding CSS only applies once <html> has the "js-reveal" class, which we
// add here, so without JavaScript (or without IntersectionObserver) nothing
// stays hidden. Shown elements get data-shown, an attribute React does not
// manage, so a re-render never hides them again. Reduced motion: the CSS
// skips the animation entirely.

import { useEffect } from "react";

// ref: the container to look in. key: change it to look again (new items).
export function useReveal(ref, key) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const items = root.querySelectorAll("[data-reveal]:not([data-shown])");
    if (typeof IntersectionObserver === "undefined") {
      items.forEach((item) => item.setAttribute("data-shown", ""));
      return undefined;
    }
    document.documentElement.classList.add("js-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute("data-shown", "");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [ref, key]);
}
