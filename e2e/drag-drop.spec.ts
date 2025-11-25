import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to get launch options
const getLaunchOptions = () => ({
  args: [
    'dist/main/main.js',
    ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
  ],
});

test.describe('Drag and Drop - Files', () => {
  // Note: test-assets/test-assets/sample-video.mp4 is a placeholder
  // Real video file tests would need a proper test video
  const testVideoPath = path.join(__dirname, '../test-assets/test-assets/sample-video.mp4');

  test('should show drag overlay when dragging file over app', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Simulate dragover event
    await window.evaluate(() => {
      const appDiv = document.querySelector('.app');
      if (appDiv) {
        const dragOverEvent = new globalThis.DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new globalThis.DataTransfer(),
        });
        // Add Files type to indicate file drag
        Object.defineProperty(dragOverEvent, 'dataTransfer', {
          value: {
            types: ['Files'],
            files: [],
            getData: () => '',
          },
        });
        appDiv.dispatchEvent(dragOverEvent);
      }
    });

    // Check for drag overlay
    const overlay = window.locator('.drag-drop-overlay');
    await expect(overlay).toBeVisible({ timeout: 2000 });

    await app.close();
  });

  test('should have getPathForFile API available in preload', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Check that the API is available
    const hasApi = await window.evaluate(() => {
      return typeof window.electron?.file?.getPathForFile === 'function';
    });

    expect(hasApi).toBe(true);

    await app.close();
  });

  test.skip('should load video when file is dropped (simulated via IPC)', async () => {
    // Skip: requires a real video file, not a placeholder
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Simulate what happens after a successful drop by directly calling the metadata API
    const metadata = await window.evaluate(async (videoPath) => {
      return await window.electron.video.getMetadata(videoPath);
    }, testVideoPath);

    expect(metadata).toBeTruthy();
    expect(metadata.filename).toBe('sample-video.mp4');

    await app.close();
  });
});

test.describe('Drag and Drop - URLs', () => {
  test('should show URL drag overlay when dragging URL over app', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Simulate dragover with text/plain (URL)
    await window.evaluate(() => {
      const appDiv = document.querySelector('.app');
      if (appDiv) {
        const dragOverEvent = new globalThis.DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(dragOverEvent, 'dataTransfer', {
          value: {
            types: ['text/plain'],
            files: [],
            getData: () => 'https://example.com/video.mp4',
          },
        });
        appDiv.dispatchEvent(dragOverEvent);
      }
    });

    const overlay = window.locator('.drag-drop-overlay');
    await expect(overlay).toBeVisible({ timeout: 2000 });

    await app.close();
  });

  test('should open download modal when URL is dropped', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Simulate drop event with URL
    await window.evaluate(() => {
      const appDiv = document.querySelector('.app');
      if (appDiv) {
        const dropEvent = new globalThis.DragEvent('drop', {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(dropEvent, 'dataTransfer', {
          value: {
            types: ['text/plain'],
            files: [],
            getData: () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          },
        });
        dropEvent.preventDefault = () => {};
        appDiv.dispatchEvent(dropEvent);
      }
    });

    // Wait for download modal to appear
    await window.waitForTimeout(500);
    const modal = window.locator('.download-url-modal-backdrop');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await app.close();
  });
});
