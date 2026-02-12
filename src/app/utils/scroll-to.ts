/**
 * Smooth-scrolls to a target element by its DOM id with an optional vertical offset.
 *
 * If the element exists on the current page, the function scrolls to it using
 * `window.scrollTo` with smooth behavior.
 *
 * If the element does not exist and `ensureRoot` is enabled, the function stores
 * the desired anchor id in sessionStorage and navigates to the root route ('/').
 * This allows the landing page to consume the anchor and scroll to it after
 * navigation.
 *
 * Requirements / assumptions (based on current implementation):
 * - This function must run in a browser context (uses `document`, `window`,
 *   `sessionStorage`).
 * - The consumer is expected to read `return-anchor` from sessionStorage on the
 *   root route and perform the final scroll (e.g. `consumeReturnAnchor()` logic).
 *
 * @param targetId DOM id of the element to scroll to.
 * @param offset Vertical offset in pixels subtracted from the target position (default: 100).
 * @param ensureRoot When true, navigates to '/' if the target is not found on the current route.
 */
export function scrollUp(
  targetId: string,
  offset: number = 100,
  ensureRoot: boolean = false
): void {
  const targetElement = document.getElementById(targetId);

  if (targetElement) {
    const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    return;
  }

  if (ensureRoot && window.location.pathname !== '/') {
    sessionStorage.setItem('return-anchor', targetId);
    window.location.href = '/';
  }
}
