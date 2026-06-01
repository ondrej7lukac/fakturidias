// Ambient declaration so TypeScript accepts side-effect CSS imports
// (e.g. `import './Component.css'`). Vite handles the actual bundling.
declare module '*.css';
