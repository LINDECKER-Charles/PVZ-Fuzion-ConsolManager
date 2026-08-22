/** Tiny DOM lookup helpers — fail loudly when the markup and the script drift apart. */

export const requireElement = <T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`site: missing element for selector "${selector}"`);
  return element;
};

export const queryAll = <T extends Element = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T[] => Array.from(root.querySelectorAll<T>(selector));
