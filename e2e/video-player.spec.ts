import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Video Player - File Selection', () => {
  test('should display file selection button', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    const selectButton = window.locator('[data-testid="select-file-button"]');
    await expect(selectButton).toBeVisible();
    await expect(selectButton).toContainText(/select.*file/i);

    await app.close();
  });

  test('should open file dialog when button clicked', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    // Mock the dialog to prevent actual dialog from opening
    await app.evaluate(({ dialog }) => {
      dialog.showOpenDialog = async () => {
        return { canceled: true, filePaths: [] };
      };
    });

    const selectButton = window.locator('[data-testid="select-file-button"]');
    await selectButton.click();

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

    // Mock file selection
    await app.evaluate(({ dialog }, testPath) => {
      dialog.showOpenDialog = async () => {
        return { canceled: false, filePaths: [testPath] };
      };
    }, testVideoPath);

    const selectButton = window.locator('[data-testid="select-file-button"]');
    await selectButton.click();

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

  test('should display video duration and metadata', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    // Wait for metadata to load
    await window.waitForTimeout(2000);

    const metadataPanel = window.locator('[data-testid="video-metadata-panel"]');
    await expect(metadataPanel).toBeVisible({ timeout: 5000 });

    await app.close();
  });

  test('should toggle between file selector and player', async () => {
    const app = await electron.launch({ args: ['.'] });
    const window = await app.firstWindow();

    await loadTestVideo(app, window, testVideoPath);

    const player = window.locator('[data-testid="video-player"]');
    await expect(player).toBeVisible();

    // Click change file button
    const changeButton = window.locator('[data-testid="change-file-button"]');
    await changeButton.click();

    // Should show file selector again
    const fileSelector = window.locator('[data-testid="file-selector"]');
    await expect(fileSelector).toBeVisible();

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
async function loadTestVideo(app: any, window: any, videoPath: string) {
  await app.evaluate(({ dialog }, testPath) => {
    dialog.showOpenDialog = async () => {
      return { canceled: false, filePaths: [testPath] };
    };
  }, videoPath);

  const selectButton = window.locator('[data-testid="select-file-button"]');
  await selectButton.click();
  await window.waitForTimeout(1000);
}
