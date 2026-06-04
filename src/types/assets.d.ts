// Ambient declarations for non-code side-effect imports.
// Next ships these for images (*.png, *.svg, …) but not for stylesheets,
// so the production type-check needs this for `import './globals.css'`.
declare module '*.css';
