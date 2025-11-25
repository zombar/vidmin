import { ipcMain, dialog, app } from 'electron';
import { selectVideoFile, getVideoMetadata, getVideoFileUrl } from './file-manager';
import { downloadManager } from './download-manager';
import path from 'path';
import fs from 'fs/promises';

export function setupIpcHandlers() {
  // Ping-pong test handler
  ipcMain.handle('ping', async () => {
    return 'pong';
  });

  // Video file selection
  ipcMain.handle('select-video-file', async () => {
    const filePath = await selectVideoFile();
    if (!filePath) {
      return null;
    }

    const metadata = await getVideoMetadata(filePath);
    const url = getVideoFileUrl(filePath);

    return {
      ...metadata,
      url,
    };
  });

  // Get video metadata
  ipcMain.handle('get-video-metadata', async (_event, filePath: string) => {
    return await getVideoMetadata(filePath);
  });

  // Download location
  ipcMain.handle('select-download-location', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Download Location',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('get-default-download-location', async () => {
    return app.getPath('videos');
  });

  // Check yt-dlp installation
  ipcMain.handle('check-yt-dlp', async () => {
    const isInstalled = await downloadManager.checkYtDlpInstalled();
    return { isInstalled };
  });

  // URL validation
  ipcMain.handle('validate-url', async (_event, url: string) => {
    const isValid = downloadManager.validateUrl(url);
    const source = isValid ? downloadManager.detectSource(url) : null;

    return { isValid, source };
  });

  // Fetch video formats
  ipcMain.handle('fetch-video-formats', async (_event, url: string) => {
    return await downloadManager.fetchFormats(url);
  });

  // Start download
  ipcMain.handle('start-download', async (event, options: {
    url: string;
    downloadPath: string;
    filename: string;
    format: string;
  }) => {
    const outputPath = path.join(options.downloadPath, options.filename);

    try {
      const downloadId = await downloadManager.startDownload({
        url: options.url,
        outputPath,
        format: options.format,
        onProgress: (progress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('download-progress', downloadId, progress);
          }
        },
        onComplete: () => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('download-complete', downloadId, outputPath);
          }
        },
        onError: (error) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('download-error', downloadId, error.message);
          }
        },
      });

      return { success: true, downloadId };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Cancel download
  ipcMain.handle('cancel-download', async (_event, downloadId: string) => {
    downloadManager.cancelDownload(downloadId);
    return { success: true };
  });

  // Get download status
  ipcMain.handle('get-download-status', async (_event, downloadId: string) => {
    const download = downloadManager.getDownload(downloadId);
    return download || null;
  });

  // Get all downloads
  ipcMain.handle('get-all-downloads', async () => {
    return downloadManager.getAllDownloads();
  });

  // File operations
  ipcMain.handle('write-file', async (_event, filePath: string, data: Uint8Array) => {
    // eslint-disable-next-line no-undef
    await fs.writeFile(filePath, Buffer.from(data));
  });
}
