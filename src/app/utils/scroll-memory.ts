/**
 * Persists the current vertical scroll position for a given key into sessionStorage.
 *
 * This is useful when navigating away from a route and later restoring the user's
 * previous scroll position after returning.
 *
 * Note:
 * - Uses browser-only APIs (`window`, `document`, `sessionStorage`).
 * - The stored value is namespaced as `scroll-position-${key}` to avoid collisions.
 *
 * @param key Logical identifier used to namespace the stored scroll position.
 */
export function saveScrollPosition(key: string): void {
  const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
  sessionStorage.setItem(`scroll-position-${key}`, scrollY.toString());
}

/**
 * Restores a previously stored vertical scroll position from sessionStorage.
 *
 * If a position exists, the page is scrolled to that position minus the provided
 * offset. The offset can be used to account for fixed headers.
 *
 * Behavior:
 * - If no stored value exists, the function does nothing.
 * - If the computed position is negative, it clamps to 0.
 * - Uses smooth scrolling.
 *
 * Note:
 * - Uses browser-only APIs (`window`, `sessionStorage`).
 *
 * @param key Logical identifier used to namespace the stored scroll position.
 * @param offset Vertical offset in pixels subtracted from the stored position (default: 0).
 */
export function restoreScrollPosition(key: string, offset: number = 0): void {
  const stored = sessionStorage.getItem(`scroll-position-${key}`);
  if (!stored) return;

  const position = parseInt(stored, 10) - offset;

  window.scrollTo({
    top: position >= 0 ? position : 0,
    behavior: 'smooth'
  });
}

/**
 * Removes a previously stored scroll position for a given key from sessionStorage.
 *
 * @param key Logical identifier used to namespace the stored scroll position.
 */
export function clearScrollPosition(key: string): void {
  sessionStorage.removeItem(`scroll-position-${key}`);
}

/**
 * Stores an element id (anchor) to be consumed after navigation.
 *
 * Intended usage:
 * - Before navigating away (e.g. to a legal/privacy page), store the id of the
 *   section you want to return to.
 * - After navigating back to the root/landing page, call `consumeReturnAnchor()`
 *   to read and clear the stored id, then scroll to that section.
 *
 * @param id DOM id of the section/anchor that should be scrolled to later.
 */
export function setReturnAnchor(id: string): void {
  sessionStorage.setItem('return-anchor', id);
}

/**
 * Reads and clears the stored return anchor from sessionStorage.
 *
 * This function implements "read-once" semantics:
 * - If an anchor exists, it is returned and immediately removed.
 * - If no anchor exists, it returns null.
 *
 * @returns The stored return-anchor id or null if none is stored.
 */
export function consumeReturnAnchor(): string | null {
  const v = sessionStorage.getItem('return-anchor');
  if (v !== null) {
    sessionStorage.removeItem('return-anchor');
  }
  return v;
}
