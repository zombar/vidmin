import { ipcMain } from 'electron';
import { selectVideoFile, getVideoMetadata, getVideoFileUrl } from './file-manager';

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
}
