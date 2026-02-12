import { isPlatformBrowser } from '@angular/common';

/**
 * Observes elements with a given CSS class and applies a one-time "reveal" state
 * when they enter the viewport.
 *
 * How it works:
 * - Finds all elements matching `.${className}`.
 * - Observes them using IntersectionObserver.
 * - When an element crosses the visibility threshold, it:
 *   - adds the `in-view` class
 *   - sets the CSS custom property `--reveal-delay` (used by CSS animations)
 *   - stops observing that element (one-time reveal)
 *
 * SSR / platform safety:
 * - If `platformId` is provided, the function exits early on non-browser platforms
 *   to avoid accessing DOM APIs.
 *
 * Duplicate initialization guard:
 * - Elements are marked with `data-reveal-observed="true"` so that repeated calls
 *   from multiple components do not attach multiple observers to the same element.
 *
 * Expected CSS contract:
 * - Your styles should define a base state (e.g. `.reveal-zoom { opacity: 0; }`)
 *   and an "in-view" state (e.g. `.reveal-zoom.in-view { animation: ... }`)
 *   that uses `var(--reveal-delay, 0ms)` for delayed animations.
 *
 * @param className CSS class name (without '.') used to select elements to reveal.
 * @param delay Delay in milliseconds applied via the `--reveal-delay` CSS variable.
 * @param platformId Optional Angular platform id for SSR-safe usage.
 */
export function observeAnimationReveal(
  className: string,
  delay: number = 0,
  platformId?: object
): void {
  if (platformId && !isPlatformBrowser(platformId)) {
    return;
  }

  const elements = document.querySelectorAll<HTMLElement>(`.${className}`);

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const el = entry.target as HTMLElement;
        el.classList.add('in-view');
        el.style.setProperty('--reveal-delay', `${delay}ms`);
        observer.unobserve(el); // reveal only once per element
      });
    },
    { threshold: 0.3 }
  );

  elements.forEach(el => {
    if (el.dataset['revealObserved'] === 'true') return;
    el.dataset['revealObserved'] = 'true';

    el.classList.add('reveal-init');
    observer.observe(el);
  });
}
