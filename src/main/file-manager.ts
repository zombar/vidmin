import { dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export async function selectVideoFile(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {
        name: 'Video Files',
        extensions: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv', 'm4v', 'ts', 'm2ts', 'mts', 'mpg', 'mpeg', 'vob'],
      },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
}

export async function getVideoMetadata(filePath: string) {
  const stats = await fs.stat(filePath);
  const filename = path.basename(filePath);
  const extension = path.extname(filePath).toLowerCase().slice(1);

  return {
    filename,
    path: filePath,
    size: stats.size,
    format: extension,
    createdAt: stats.birthtime,
    modifiedAt: stats.mtime,
  };
}

export function getVideoFileUrl(filePath: string): string {
  // Use custom vidmin: protocol for proper video streaming support
  // This protocol handler supports Range requests for video seeking
  // Note: Use single slash to avoid hostname lowercasing (vidmin:/path not vidmin://path)
  return `vidmin:${filePath}`;
}
