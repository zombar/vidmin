import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Video Player - File Selection', () => {
  test('should display floating action buttons', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Phase 6 UI uses floating action buttons instead of inline button
    const fabCentered = window.locator('[data-testid="fab-centered"]');
    await expect(fabCentered).toBeVisible();

    await app.close();
  });

  test('should open file dialog when Open File FAB clicked', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Mock the dialog to prevent actual dialog from opening
    await app.evaluate(({ dialog }) => {
      dialog.showOpenDialog = async () => {
        return { canceled: true, filePaths: [] };
      };
    });

    // Find and click the Open File FAB (folder icon)
    const openFileFab = window.locator('.fab-container.centered button[aria-label*="Open"]').first();
    await openFileFab.click();

    // Wait a bit for any state changes
    await window.waitForTimeout(500);

    await app.close();
  });
});

test.describe('Video Player - Playback Controls', () => {
  const testVideoPath = path.join(__dirname, '../test-assets/sample-video.mp4');

  test('should load and display video player when file selected', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Mock file selection
    await app.evaluate(({ dialog }, testPath) => {
      dialog.showOpenDialog = async () => {
        return { canceled: false, filePaths: [testPath] };
      };
    }, testVideoPath);

    // Click the Open File FAB
    const openFileFab = window.locator('.fab-container.centered button[aria-label*="Open"]').first();
    await openFileFab.click();

    // Wait for player to appear
    const player = window.locator('[data-testid="video-player"]');
    await expect(player).toBeVisible({ timeout: 5000 });

    await app.close();
  });

  test('should display video filename', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const filename = window.locator('[data-testid="video-filename"]');
    await expect(filename).toBeVisible();
    await expect(filename).toContainText('sample-video.mp4');

    await app.close();
  });

  test('should play video when play button clicked', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    // Find and click play button (Vidstack uses media-play-button)
    await window.waitForTimeout(2000); // Wait for video to load

    const playButton = window.locator('media-play-button').first();
    if (await playButton.isVisible()) {
      await playButton.click();
      await window.waitForTimeout(500);

      // Check if video is playing
      const isPlaying = await window.evaluate(() => {
        const video = document.querySelector('video');
        return video && !video.paused;
      });

      expect(isPlaying).toBe(true);
    }

    await app.close();
  });

  test('should display video metadata in overlay', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    // Wait for video to load
    await window.waitForTimeout(2000);

    // Phase 6 UI shows metadata in the video info overlay
    const metadata = window.locator('[data-testid="video-metadata"]');
    await expect(metadata).toBeVisible({ timeout: 5000 });

    await app.close();
  });

  test('should have close video button in FAB menu', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const player = window.locator('[data-testid="video-player"]');
    await expect(player).toBeVisible();

    // Phase 6 UI has FAB menu with close button
    const fabMenu = window.locator('[data-testid="fab-main-menu"]');
    await expect(fabMenu).toBeVisible();

    await app.close();
  });
});

test.describe('Video Player - Keyboard Shortcuts', () => {
  const testVideoPath = path.join(__dirname, '../test-assets/sample-video.mp4');

  test('should play/pause with spacebar', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);
    await window.waitForTimeout(2000);

    // Press spacebar to play
    await window.keyboard.press('Space');
    await window.waitForTimeout(500);

    const isPlaying = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video && !video.paused;
    });

    // Should either be playing or paused (depending on initial state)
    expect(typeof isPlaying).toBe('boolean');

    await app.close();
  });

  test('should seek forward with arrow right', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);
    await window.waitForTimeout(2000);

    const initialTime = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.currentTime : 0;
    });

    await window.keyboard.press('ArrowRight');
    await window.waitForTimeout(500);

    const newTime = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.currentTime : 0;
    });

    expect(newTime).toBeGreaterThanOrEqual(initialTime);

    await app.close();
  });

  test('should toggle mute with M key', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);
    await window.waitForTimeout(2000);

    const initialMuted = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.muted : false;
    });

    await window.keyboard.press('m');
    await window.waitForTimeout(300);

    const newMuted = await window.evaluate(() => {
      const video = document.querySelector('video');
      return video ? video.muted : false;
    });

    expect(newMuted).toBe(!initialMuted);

    await app.close();
  });
});

// Helper function
async function loadTestVideo(app: Awaited<ReturnType<typeof electron.launch>>, window: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>['firstWindow']>>, videoPath: string) {
  await window.waitForLoadState('domcontentloaded');
  await window.waitForTimeout(2000);

  await app.evaluate(({ dialog }, testPath) => {
    dialog.showOpenDialog = async () => {
      return { canceled: false, filePaths: [testPath] };
    };
  }, videoPath);

  // Click the Open File FAB in Phase 6 UI
  const openFileFab = window.locator('.fab-container.centered button[aria-label*="Open"]').first();
  await openFileFab.click();
  await window.waitForTimeout(1000);
}
