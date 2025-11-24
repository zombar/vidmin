import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dialog } from 'electron';
import { selectVideoFile, getVideoMetadata, getVideoFileUrl } from '../file-manager';
import fs from 'fs/promises';

vi.mock('electron', () => ({
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('fs/promises', () => ({
  default: {
    stat: vi.fn(),
  },
}));

describe('File Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('selectVideoFile', () => {
    it('should open file dialog with correct options', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/video.mp4'],
      });

      const result = await selectVideoFile();

      expect(dialog.showOpenDialog).toHaveBeenCalledWith({
        properties: ['openFile'],
        filters: expect.arrayContaining([
          expect.objectContaining({
            name: expect.stringMatching(/video/i),
            extensions: expect.arrayContaining(['mp4', 'webm', 'mkv']),
          }),
        ]),
      });

      expect(result).toBe('/path/to/video.mp4');
    });

    it('should return null when dialog canceled', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: true,
        filePaths: [],
      });

      const result = await selectVideoFile();
      expect(result).toBeNull();
    });

    it('should return null when no files selected', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: [],
      });

      const result = await selectVideoFile();
      expect(result).toBeNull();
    });

    it('should accept multiple video formats', async () => {
      vi.mocked(dialog.showOpenDialog).mockResolvedValue({
        canceled: false,
        filePaths: ['/path/to/video.mp4'],
      });

      await selectVideoFile();

      const callArgs = vi.mocked(dialog.showOpenDialog).mock.calls[0][0];
      const videoFilter = callArgs.filters?.find((f) => f.name.match(/video/i));

      expect(videoFilter?.extensions).toContain('mp4');
      expect(videoFilter?.extensions).toContain('webm');
      expect(videoFilter?.extensions).toContain('mkv');
      expect(videoFilter?.extensions).toContain('avi');
      expect(videoFilter?.extensions).toContain('mov');
    });
  });

  describe('getVideoMetadata', () => {
    it('should extract video metadata', async () => {
      const mockStats = {
        size: 1048576,
        birthtime: new Date('2024-01-01'),
        mtime: new Date('2024-01-02'),
      };

      vi.mocked(fs.stat).mockResolvedValue(mockStats as unknown as fs.Stats);

      const metadata = await getVideoMetadata('/path/to/video.mp4');

      expect(metadata).toHaveProperty('filename', 'video.mp4');
      expect(metadata).toHaveProperty('path', '/path/to/video.mp4');
      expect(metadata).toHaveProperty('size', 1048576);
      expect(metadata).toHaveProperty('format', 'mp4');
      expect(metadata.createdAt).toEqual(mockStats.birthtime);
      expect(metadata.modifiedAt).toEqual(mockStats.mtime);
    });

    it('should handle different file extensions', async () => {
      const mockStats = {
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
      };

      vi.mocked(fs.stat).mockResolvedValue(mockStats as unknown as fs.Stats);

      const webmMetadata = await getVideoMetadata('/path/to/video.webm');
      expect(webmMetadata.format).toBe('webm');

      const mkvMetadata = await getVideoMetadata('/path/to/video.mkv');
      expect(mkvMetadata.format).toBe('mkv');
    });
  });

  describe('getVideoFileUrl', () => {
    it('should convert file path to file:// URL', () => {
      const filePath = '/path/to/video.mp4';
      const url = getVideoFileUrl(filePath);

      expect(url).toBe('file:///path/to/video.mp4');
    });

    it('should handle paths with spaces', () => {
      const filePath = '/path/to/my video.mp4';
      const url = getVideoFileUrl(filePath);

      expect(url).toContain('file://');
      expect(url).toContain('my video.mp4');
    });
  });
});
