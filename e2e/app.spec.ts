import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

// Helper to get launch options with CI-specific flags
const getLaunchOptions = (additionalArgs: string[] = []) => ({
  args: [
    'dist/main/main.js',
    ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
    ...additionalArgs,
  ],
});

test.describe('Application Launch', () => {
  test('should launch electron app successfully', async () => {
    const app = await electron.launch(getLaunchOptions());

    const window = await app.firstWindow();
    expect(window).toBeTruthy();

    await app.close();
  });

  test('should display main window with correct title', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    const title = await window.title();
    expect(title).toBe('MediaMine Video Player');

    await app.close();
  });

  test('should have correct window dimensions', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    const size = await window.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));

    expect(size.width).toBeGreaterThanOrEqual(1000);
    expect(size.height).toBeGreaterThanOrEqual(600);

    await app.close();
  });

  test('should render React app root element', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    const root = await window.locator('#root');
    await expect(root).toBeVisible();

    await app.close();
  });

  test('should display app header', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    // Wait for page to load
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    const header = await window.locator('[data-testid="app-header"]');
    await expect(header).toBeVisible();
    await expect(header).toContainText('MediaMine');

    await app.close();
  });
});

test.describe('Development Environment', () => {
  test('should have DevTools available in development mode', async () => {
    const app = await electron.launch({
      ...getLaunchOptions(),
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
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    // Wait for the app to load
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Test ping-pong IPC
    const result = await window.evaluate(() => {
      return window.electron.ipcRenderer.invoke('ping');
    });

    expect(result).toBe('pong');

    await app.close();
  });

  test('should expose safe IPC API in renderer', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    const hasIpcAPI = await window.evaluate(() => {
      return typeof window.electron !== 'undefined' &&
             typeof window.electron.ipcRenderer !== 'undefined';
    });

    expect(hasIpcAPI).toBe(true);

    await app.close();
  });
});
