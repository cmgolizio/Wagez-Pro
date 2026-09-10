/**
 * Catching focus when a control disappears out from under it.
 *
 * Wagez replaces controls in place: "Add to week" becomes the day it was saved
 * to, a card being edited becomes the card again, a deleted shift becomes the
 * one below it. Whenever the element that had focus is the one that has gone,
 * the browser drops focus on the document body — and a keyboard user is left at
 * the top of the page with nothing to tab from.
 *
 * So the replacement takes the focus the original was holding. Only then,
 * though: if focus is somewhere else entirely, it is somewhere the user put it,
 * and moving it would be worse than the problem being fixed.
 *
 * @param {Element|null|undefined} node where focus should land instead.
 * @returns {boolean} whether it was moved.
 */
export function focusIfLost(node) {
  if (node === null || node === undefined) return false;

  const active = document.activeElement;
  if (active !== null && active !== document.body) return false;

  node.focus();
  return true;
}
