/** Desktop window-chrome detection for inline-titlebar layout variants. */

/**
 * Whether the client runs in the macOS desktop shell: the Electron preload
 * marks `<html>` with `data-platform="darwin"`; plain web never sets it.
 * Read at render time — the mark may arrive as late as DOMContentLoaded.
 * @returns true only inside the macOS Electron shell.
 */
export function isDarwinDesktop(): boolean {
  return document.documentElement.dataset.platform === 'darwin'
}

/**
 * Whether the window chrome lives inside the page rather than in a caption strip:
 * the macOS hidden-inset titlebar, or the Linux window-controls overlay that the
 * desktop preload marks `data-inline-titlebar`. Both put the window buttons over
 * the page, so chrome rows own the window drag and the sidebar opens with a strip.
 * Read at render time — the mark may arrive as late as DOMContentLoaded.
 * @returns true inside a desktop shell that draws no caption strip.
 */
export function hasInlineWindowChrome(): boolean {
  const root = document.documentElement
  return root.dataset.platform === 'darwin' || root.hasAttribute('data-inline-titlebar')
}
