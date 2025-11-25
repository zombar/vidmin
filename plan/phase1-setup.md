# Phase 1: Project Setup & Infrastructure

## Overview
Set up the foundational Electron + React + TypeScript + Vite project with comprehensive testing infrastructure using Test-Driven Development methodology.

## Technology Stack
- **Platform**: Electron 28+
- **Framework**: React 18+
- **Language**: TypeScript 5+
- **Build Tool**: Vite 5+
- **E2E Testing**: Playwright
- **Unit Testing**: Vitest
- **State Management**: Zustand
- **Persistence**: electron-store

## Prerequisites
- Node.js 20+ installed
- Python 3.7+ (for yt-dlp dependency)
- Git initialized in project directory

---

## TDD Test Specifications (Write Tests First)

### 1.1 Playwright E2E Tests

Create `e2e/app.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

test.describe('Application Launch', () => {
  test('should launch electron app successfully', async () => {
    const app = await electron.launch({
      args: ['.'],
    });

    const window = await app.firstWindow();
    expect(window).toBeTruthy();

    await app.close();
  });

  test('should display main window with correct title', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    const title = await window.title();
    expect(title).toBe('Vidmin Player');

    await app.close();
  });

  test('should have correct window dimensions', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    const size = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    expect(size.width).toBeGreaterThanOrEqual(1200);
    expect(size.height).toBeGreaterThanOrEqual(700);

    await app.close();
  });

  test('should render React app root element', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    const root = await window.locator('#root');
    await expect(root).toBeVisible();

    await app.close();
  });

  test('should display app header', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    const header = await window.locator('[data-testid="app-header"]');
    await expect(header).toBeVisible();
    await expect(header).toContainText('Vidmin');

    await app.close();
  });
});

test.describe('Development Environment', () => {
  test('should have DevTools available in development mode', async () => {
    const app = await electron.launch({
      args: ['.'],
      env: { NODE_ENV: 'development' },
    });

    const window = await app.firstWindow();
    const isDevToolsOpened = await app.evaluate(async ({ webContents }) => {
      return webContents.getAllWebContents()[0].isDevToolsOpened();
    });

    // DevTools should be openable
    expect(isDevToolsOpened).toBeDefined();

    await app.close();
  });
});

test.describe('IPC Communication', () => {
  test('should establish IPC communication between main and renderer', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    // Test ping-pong IPC
    const result = await window.evaluate(() => {
      return window.electron.ipcRenderer.invoke('ping');
    });

    expect(result).toBe('pong');

    await app.close();
  });

  test('should expose safe IPC API in renderer', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    const hasIpcAPI = await window.evaluate(() => {
      return typeof window.electron !== 'undefined' &&
             typeof window.electron.ipcRenderer !== 'undefined';
    });

    expect(hasIpcAPI).toBe(true);

    await app.close();
  });
});
```

### 1.2 Vitest Unit Tests

Create `src/renderer/App.test.tsx`:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByTestId('app-header')).toBeInTheDocument();
  });

  it('should display application name', () => {
    render(<App />);
    expect(screen.getByText(/Vidmin/i)).toBeInTheDocument();
  });

  it('should render main container', () => {
    render(<App />);
    expect(screen.getByTestId('main-container')).toBeInTheDocument();
  });
});
```

Create `src/main/ipc-handlers.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain } from 'electron';
import { setupIpcHandlers } from './ipc-handlers';

describe('IPC Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register ping handler', () => {
    const handleSpy = vi.spyOn(ipcMain, 'handle');
    setupIpcHandlers();

    expect(handleSpy).toHaveBeenCalledWith('ping', expect.any(Function));
  });

  it('should respond with pong to ping', async () => {
    setupIpcHandlers();

    // Simulate IPC call
    const handlers = (ipcMain as any)._handlers || {};
    const pingHandler = handlers['ping'];

    expect(pingHandler).toBeDefined();
    const result = await pingHandler();
    expect(result).toBe('pong');
  });
});
```

---

## Implementation Steps (Red-Green-Refactor)

### Step 1: Initialize Project Structure

```bash
# Create project directory (if not exists)
mkdir -p vidmin
cd vidmin

# Initialize package.json
npm init -y

# Install dependencies
npm install react react-dom
npm install electron
npm install zustand
npm install electron-store

# Install dev dependencies
npm install -D @types/react @types/react-dom @types/node
npm install -D typescript
npm install -D vite @vitejs/plugin-react
npm install -D electron-builder
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
npm install -D playwright @playwright/test
npm install -D concurrently cross-env
```

### Step 2: Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "node", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "types": ["node"]
  },
  "include": ["electron.vite.config.ts", "src/main/**/*", "src/preload/**/*"]
}
```

### Step 3: Configure Vite

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/renderer/test-setup.ts',
  },
});
```

Create `src/renderer/test-setup.ts`:

```typescript
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

### Step 4: Configure Playwright

Create `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.ts',
    },
  ],
});
```

### Step 5: Create Electron Main Process

Create `src/main/main.ts`:

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';
import { setupIpcHandlers } from './ipc-handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'Vidmin Player',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

Create `src/main/ipc-handlers.ts`:

```typescript
import { ipcMain } from 'electron';

export function setupIpcHandlers() {
  // Ping-pong test handler
  ipcMain.handle('ping', async () => {
    return 'pong';
  });

  // Add more handlers as needed
}
```

### Step 6: Create Preload Script

Create `src/preload/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
    on: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    removeListener: (channel: string, func: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, func);
    },
  },
});
```

Create `src/preload/preload.d.ts`:

```typescript
export interface IElectronAPI {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    on: (channel: string, func: (...args: any[]) => void) => void;
    removeListener: (channel: string, func: (...args: any[]) => void) => void;
  };
}

declare global {
  interface Window {
    electron: IElectronAPI;
  }
}
```

### Step 7: Create React Application

Create `src/renderer/App.tsx`:

```typescript
import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [pingResult, setPingResult] = useState<string>('');

  useEffect(() => {
    // Test IPC communication
    window.electron.ipcRenderer.invoke('ping').then((result) => {
      setPingResult(result);
    });
  }, []);

  return (
    <div className="app">
      <header data-testid="app-header" className="app-header">
        <h1>Vidmin Player</h1>
      </header>
      <main data-testid="main-container" className="main-container">
        <p>Welcome to Vidmin Player - Your Advanced Video Player</p>
        {pingResult && <p data-testid="ipc-test">IPC Test: {pingResult}</p>}
      </main>
    </div>
  );
}

export default App;
```

Create `src/renderer/App.css`:

```css
.app {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.app-header {
  padding: 1rem 2rem;
  background: #2a2a2a;
  border-bottom: 1px solid #3a3a3a;
}

.app-header h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.main-container {
  flex: 1;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
```

Create `src/renderer/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/renderer/index.css`:

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow: hidden;
}

#root {
  width: 100%;
  height: 100vh;
}
```

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'">
    <title>Vidmin Player</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

### Step 8: Create Build Scripts

Create `scripts/build-main.js`:

```javascript
import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildMain() {
  await build({
    configFile: false,
    build: {
      outDir: 'dist/main',
      lib: {
        entry: path.resolve(__dirname, '../src/main/main.ts'),
        formats: ['cjs'],
        fileName: () => 'main.js',
      },
      rollupOptions: {
        external: ['electron'],
      },
      emptyOutDir: true,
    },
  });
}

buildMain().catch(console.error);
```

Create `scripts/build-preload.js`:

```javascript
import { build } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function buildPreload() {
  await build({
    configFile: false,
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: path.resolve(__dirname, '../src/preload/preload.ts'),
        formats: ['cjs'],
        fileName: () => 'preload.js',
      },
      rollupOptions: {
        external: ['electron'],
      },
      emptyOutDir: true,
    },
  });
}

buildPreload().catch(console.error);
```

### Step 9: Update package.json Scripts

```json
{
  "name": "vidmin",
  "version": "0.1.0",
  "description": "Advanced video player with progressive download support",
  "main": "dist/main/main.js",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:vite\" \"npm run dev:electron\"",
    "dev:vite": "vite",
    "dev:electron": "cross-env NODE_ENV=development electron .",
    "build": "npm run build:renderer && npm run build:main && npm run build:preload",
    "build:renderer": "vite build",
    "build:main": "node scripts/build-main.js",
    "build:preload": "node scripts/build-preload.js",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:report": "playwright show-report",
    "package": "npm run build && electron-builder",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "type-check": "tsc --noEmit"
  },
  "keywords": ["electron", "react", "typescript", "video-player"],
  "author": "",
  "license": "MIT"
}
```

### Step 10: Create Shared Types

Create `src/shared/types.ts`:

```typescript
export interface VideoFile {
  id: string;
  path: string;
  name: string;
  size: number;
  duration?: number;
  format?: string;
}

export interface DownloadProgress {
  id: string;
  url: string;
  progress: number;
  speed: number;
  eta: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
}

export interface IpcChannels {
  PING: 'ping';
  // Add more channels as needed
}
```

---

## Acceptance Criteria

- [ ] Project structure created with proper TypeScript configuration
- [ ] Electron app launches successfully
- [ ] React app renders in Electron window
- [ ] IPC communication works between main and renderer processes
- [ ] All Playwright E2E tests pass (app launch, window properties, IPC)
- [ ] All Vitest unit tests pass (App component, IPC handlers)
- [ ] TypeScript compilation succeeds with no errors
- [ ] Development mode works with hot reload
- [ ] Build process creates production-ready bundles
- [ ] Test coverage > 80% for core functionality

---

## Test Execution

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e

# Run all tests
npm test && npm run test:e2e

# View test reports
npm run test:ui
npm run test:e2e:report
```

---

## Success Metrics

1. **All tests green**: 100% of Playwright and Vitest tests passing
2. **Application launches**: Window opens within 2 seconds
3. **IPC functional**: Ping-pong communication works reliably
4. **Type safety**: Zero TypeScript errors
5. **Build success**: Production build completes without errors

---

## Next Phase

Once all tests pass and acceptance criteria are met, proceed to [Phase 2: Basic Video Player](./phase2-local-player.md).
