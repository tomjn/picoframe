// The test preload (happydom.ts) registers happy-dom globally, which hangs a control API off
// `window`. Only the viewport control is declared here, because that is all the tests drive,
// and the `happy-dom` package itself is not installed as a resolvable types source.
declare global {
  interface Window {
    happyDOM: { setViewport(viewport: { width?: number; height?: number }): void };
  }
}

export {};
