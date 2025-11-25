import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';

// Helper to get launch options
const getLaunchOptions = () => ({
  args: [
    'dist/main/main.js',
    ...(process.env.CI ? ['--no-sandbox', '--disable-setuid-sandbox'] : []),
  ],
});

test.describe('Download URL Modal', () => {
  test('should open download modal from FAB button', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Click the Download URL FAB (second MUI FAB button)
    const downloadFab = window.locator('.fab-container.centered button.MuiFab-root').nth(1);
    await downloadFab.click();

    // Check modal is visible
    const modal = window.locator('.download-url-modal-backdrop');
    await expect(modal).toBeVisible({ timeout: 3000 });

    await app.close();
  });

  test('should close modal when backdrop is clicked', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Open modal
    const downloadFab = window.locator('.fab-container.centered button.MuiFab-root').nth(1);
    await downloadFab.click();

    const modal = window.locator('.download-url-modal-backdrop');
    await expect(modal).toBeVisible({ timeout: 3000 });

    // Click backdrop to close
    await modal.click({ position: { x: 10, y: 10 } });
    await expect(modal).not.toBeVisible({ timeout: 2000 });

    await app.close();
  });

  test('should have URL input field', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Open modal
    const downloadFab = window.locator('.fab-container.centered button.MuiFab-root').nth(1);
    await downloadFab.click();

    // Check for URL input
    const urlInput = window.locator('.download-url-modal input[type="text"], .download-url-modal input[type="url"]').first();
    await expect(urlInput).toBeVisible({ timeout: 3000 });

    await app.close();
  });

  test('should have browser cookies dropdown', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Open modal
    const downloadFab = window.locator('.fab-container.centered button.MuiFab-root').nth(1);
    await downloadFab.click();

    // Check for browser dropdown
    const browserSelect = window.locator('.download-url-modal select').first();
    await expect(browserSelect).toBeVisible({ timeout: 3000 });

    await app.close();
  });

  test('should have Fetch button', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Open modal
    const downloadFab = window.locator('.fab-container.centered button.MuiFab-root').nth(1);
    await downloadFab.click();

    // Check for Fetch button
    const fetchButton = window.locator('.download-url-modal button:has-text("Fetch")');
    await expect(fetchButton).toBeVisible({ timeout: 3000 });

    await app.close();
  });
});

test.describe('Download API', () => {
  test('should have download API available', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    const hasDownloadApi = await window.evaluate(() => {
      return (
        typeof window.electron?.download?.validateUrl === 'function' &&
        typeof window.electron?.download?.fetchFormats === 'function' &&
        typeof window.electron?.download?.start === 'function'
      );
    });

    expect(hasDownloadApi).toBe(true);

    await app.close();
  });

  test('should validate YouTube URL', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    const result = await window.evaluate(async () => {
      return await window.electron.download.validateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    expect(result.isValid).toBe(true);
    expect(result.source).toBe('youtube');

    await app.close();
  });

  test('should reject invalid URL', async () => {
    const app = await electron.launch(getLaunchOptions());
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    const result = await window.evaluate(async () => {
      return await window.electron.download.validateUrl('not-a-url');
    });

    expect(result.isValid).toBe(false);

    await app.close();
  });
});
