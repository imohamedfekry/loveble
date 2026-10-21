/**
 * A minimal runnable Vite + React app used as a fallback when a project does
 * not yet contain (or is missing parts of) a runnable frontend. Files provided
 * by the project always win; the scaffold only fills the gaps so the preview
 * server can always boot.
 */

const ENTRY_CANDIDATES = [
  'src/main.tsx',
  'src/main.jsx',
  'src/main.ts',
  'src/main.js',
  'src/index.tsx',
  'src/index.jsx',
  'src/index.ts',
  'src/index.js',
];

/** Pick the project entry file, or fall back to `src/main.jsx`. */
export function detectEntryPath(paths: Iterable<string>): string {
  const set = paths instanceof Set ? paths : new Set(paths);
  for (const candidate of ENTRY_CANDIDATES) {
    if (set.has(candidate)) return candidate;
  }
  return 'src/main.jsx';
}

const PACKAGE_JSON = `{
  "name": "loveble-preview",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^5.4.11"
  }
}
`;

const VITE_CONFIG = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served at the sandbox root; the backend preview proxy strips its public
// prefix before forwarding and re-adds it to absolute asset URLs.
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    hmr: false,
    allowedHosts: true,
  },
});
`;

const INDEX_CSS = `:root {
  color-scheme: light dark;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}

body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
}
`;

const APP_JSX = `export default function App() {
  return (
    <main style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Your app is running</h1>
      <p>Start building to replace this preview.</p>
    </main>
  );
}
`;

const APP_TSX = `export default function App() {
  return (
    <main style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>Your app is running</h1>
      <p>Start building to replace this preview.</p>
    </main>
  );
}
`;

function mainJsx(): string {
  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;
}

function indexHtml(entryPath: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Preview</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${entryPath}"></script>
  </body>
</html>
`;
}

/**
 * Build the scaffold files that are *not* already provided by the project.
 * Returns project-relative paths (no leading slash).
 */
export function buildScaffoldFiles(
  providedPaths: Iterable<string>,
): Array<{ path: string; data: string }> {
  const provided =
    providedPaths instanceof Set ? providedPaths : new Set(providedPaths);
  const entryPath = detectEntryPath(provided);
  const isTs = entryPath.endsWith('.ts') || entryPath.endsWith('.tsx');

  const out: Array<{ path: string; data: string }> = [];
  const add = (path: string, data: string) => {
    if (!provided.has(path)) out.push({ path, data });
  };

  add('package.json', PACKAGE_JSON);
  add('vite.config.js', VITE_CONFIG);
  add('index.html', indexHtml(entryPath));
  add(entryPath, mainJsx());
  add(isTs ? 'src/App.tsx' : 'src/App.jsx', isTs ? APP_TSX : APP_JSX);
  add('src/index.css', INDEX_CSS);

  return out;
}
