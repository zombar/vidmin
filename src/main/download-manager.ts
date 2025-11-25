import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';
import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use createRequire to import CommonJS module in ESM context
const require = createRequire(import.meta.url);
const YTDlpWrapModule = require('yt-dlp-wrap');
const YTDlpWrap = YTDlpWrapModule.default || YTDlpWrapModule;

/**
 * Get the path to the bundled yt-dlp binary
 * In production: uses bundled binary from app resources
 * In development: uses bundled binary from resources directory
 */
function getBundledYtDlpPath(): string {
  const platform = process.platform;
  const binaryName = platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';

  if (app.isPackaged) {
    // Production: use bundled binary from app resources
    const binaryPath = path.join(process.resourcesPath, 'bin', binaryName);
    // eslint-disable-next-line no-console
    console.log('[DownloadManager] Using packaged binary:', binaryPath);
    return binaryPath;
  } else {
    // Development: use binary from resources directory
    // Map Node.js platform names to electron-builder directory names
    const platformDirMap: Record<string, string> = {
      'darwin': 'mac',
      'win32': 'win',
      'linux': 'linux',
    };
    const platformDir = platformDirMap[platform] || platform;
    const binaryPath = path.join(__dirname, '../../resources', platformDir, binaryName);
    // eslint-disable-next-line no-console
    console.log('[DownloadManager] Using development binary:', binaryPath);
    return binaryPath;
  }
}

export interface DownloadOptions {
  url: string;
  outputPath: string;
  format?: string;
  cookiesFromBrowser?: string;
  onProgress?: (progress: DownloadProgress) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export interface DownloadProgress {
  id: string;
  url: string;
  progress: number;
  speed: number;
  eta: number;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'canceled';
  filename?: string;
  error?: string;
}

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  format_note?: string;
  vcodec?: string;
  acodec?: string;
}

export class DownloadManager extends EventEmitter {
  private ytDlpInstance: any | null = null;
  private ytDlpPath: string;
  private downloads: Map<string, DownloadProgress>;
  private activeProcesses: Map<string, any>;

  constructor() {
    super();
    this.downloads = new Map();
    this.activeProcesses = new Map();
    // Get bundled yt-dlp binary path
    this.ytDlpPath = getBundledYtDlpPath();
  }

  async checkYtDlpInstalled(): Promise<boolean> {
    try {
      // Check if the bundled binary file exists
      if (!fs.existsSync(this.ytDlpPath)) {
        console.error('[DownloadManager] yt-dlp binary not found at:', this.ytDlpPath);
        return false;
      }

      // Check file stats
      const stats = fs.statSync(this.ytDlpPath);

      // Verify it's a file and has reasonable size (> 1MB)
      if (!stats.isFile() || stats.size < 1024 * 1024) {
        console.error('[DownloadManager] yt-dlp binary invalid:', {
          isFile: stats.isFile(),
          size: stats.size
        });
        return false;
      }

      // On Unix systems, check if it's executable
      if (process.platform !== 'win32') {
        const isExecutable = (stats.mode & fs.constants.X_OK) !== 0;
        if (!isExecutable) {
          console.error('[DownloadManager] yt-dlp binary not executable');
          return false;
        }
      }

      // eslint-disable-next-line no-console
      console.log('[DownloadManager] yt-dlp binary found and verified:', this.ytDlpPath);
      return true;
    } catch (error) {
      console.error('[DownloadManager] Error checking yt-dlp:', error);
      return false;
    }
  }

  private async getYtDlp(): Promise<any> {
    if (!fs.existsSync(this.ytDlpPath)) {
      throw new Error(`yt-dlp binary not found at ${this.ytDlpPath}. Please run 'npm install' to download binaries.`);
    }

    if (!this.ytDlpInstance) {
      this.ytDlpInstance = new YTDlpWrap(this.ytDlpPath);
    }
    return this.ytDlpInstance;
  }

  validateUrl(url: string): boolean {
    try {
      const parsed = new globalThis.URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  detectSource(url: string): string {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    }
    if (url.match(/\.(mp4|webm|mkv|avi|mov)$/i)) {
      return 'direct';
    }
    return 'other';
  }

  async fetchFormats(url: string, cookiesFromBrowser?: string): Promise<VideoFormat[]> {
    try {
      const ytDlp = await this.getYtDlp();
      // Build args array with extractor args and optional cookies
      const args = [
        url,
        '--extractor-args',
        'generic:impersonate;youtube:player_client=web',
        '--no-check-certificates',
      ];

      // Add cookies-from-browser if specified (required for YouTube to avoid bot detection)
      if (cookiesFromBrowser && cookiesFromBrowser !== 'none') {
        args.push('--cookies-from-browser', cookiesFromBrowser);
      }

      const info = await ytDlp.getVideoInfo(args);

      // If no formats array, create a single format from the video info
      if (!info.formats || info.formats.length === 0) {
        if (info.url) {
          // Direct video URL - create a single format entry
          return [{
            format_id: info.format_id || '0',
            ext: info.ext || 'mp4',
            resolution: info.resolution || 'unknown',
            filesize: info.filesize || info.filesize_approx,
            format_note: info.format || 'direct',
            vcodec: info.vcodec,
            acodec: info.acodec,
          }];
        }
        return [];
      }

      return info.formats
        .filter((f: { vcodec?: string; acodec?: string }) => f.vcodec !== 'none' || f.acodec !== 'none')
        .map((f: { format_id: string; ext: string; resolution?: string; width?: number; height?: number; filesize?: number; format_note?: string; vcodec?: string; acodec?: string }) => ({
          format_id: f.format_id,
          ext: f.ext,
          resolution: f.resolution || `${f.width}x${f.height}`,
          filesize: f.filesize,
          format_note: f.format_note,
          vcodec: f.vcodec,
          acodec: f.acodec,
        }));
    } catch (error) {
      console.error('Error fetching formats:', error);
      throw error;
    }
  }

  async startDownload(options: DownloadOptions): Promise<string> {
    const downloadId = uuidv4();

    const progress: DownloadProgress = {
      id: downloadId,
      url: options.url,
      progress: 0,
      speed: 0,
      eta: 0,
      status: 'pending',
    };

    this.downloads.set(downloadId, progress);

    try {
      // Use flexible format selection that falls back gracefully
      // If a specific format is requested, try it first, then fall back to best available
      const formatSpec = options.format
        ? `${options.format}/bestvideo*+bestaudio/best`
        : 'bestvideo*+bestaudio/best';

      const ytDlpArgs = [
        '--format',
        formatSpec,
        '--output',
        options.outputPath,
        '--newline',
        '--no-playlist',
        '--extractor-args',
        'generic:impersonate;youtube:player_client=web',
        '--no-check-certificates',
      ];

      // Add cookies-from-browser if specified
      if (options.cookiesFromBrowser && options.cookiesFromBrowser !== 'none') {
        ytDlpArgs.push('--cookies-from-browser', options.cookiesFromBrowser);
      }

      const ytDlp = await this.getYtDlp();
      const ytDlpEventEmitter = ytDlp.exec([options.url, ...ytDlpArgs]);
      const ytDlpProcess = ytDlpEventEmitter.ytDlpProcess;
      this.activeProcesses.set(downloadId, ytDlpProcess);

      progress.status = 'downloading';
      this.downloads.set(downloadId, progress);

      ytDlpProcess.stdout?.on('data', (data: globalThis.Buffer) => {
        const output = data.toString();
        const progressMatch = output.match(/(\d+\.?\d*)%/);
        const speedMatch = output.match(/([\d.]+)(K|M|G)iB\/s/);
        const etaMatch = output.match(/ETA\s+([\d:]+)/);

        if (progressMatch) {
          progress.progress = parseFloat(progressMatch[1]);
        }

        if (speedMatch) {
          const value = parseFloat(speedMatch[1]);
          const unit = speedMatch[2];
          const multiplier: Record<string, number> = { K: 1024, M: 1024 * 1024, G: 1024 * 1024 * 1024 };
          progress.speed = value * (multiplier[unit] || 1);
        }

        if (etaMatch) {
          progress.eta = this.parseETA(etaMatch[1]);
        }

        this.downloads.set(downloadId, progress);
        options.onProgress?.(progress);
        this.emit('progress', downloadId, progress);
      });

      ytDlpProcess.on('close', (code: number | null) => {
        this.activeProcesses.delete(downloadId);

        if (code === 0) {
          progress.status = 'completed';
          progress.progress = 100;
          options.onComplete?.();
          this.emit('complete', downloadId);
        } else {
          progress.status = 'error';
          progress.error = `Download failed with code ${code}`;
          options.onError?.(new Error(progress.error));
          this.emit('error', downloadId, progress.error);
        }

        this.downloads.set(downloadId, progress);
      });

      ytDlpProcess.on('error', (error: Error) => {
        progress.status = 'error';
        progress.error = error.message;
        this.downloads.set(downloadId, progress);
        options.onError?.(error);
        this.emit('error', downloadId, error);
      });

    } catch (error) {
      progress.status = 'error';
      progress.error = (error as Error).message;
      this.downloads.set(downloadId, progress);
      throw error;
    }

    return downloadId;
  }

  cancelDownload(downloadId: string): void {
    const process = this.activeProcesses.get(downloadId);
    if (process) {
      process.kill();
      this.activeProcesses.delete(downloadId);

      const progress = this.downloads.get(downloadId);
      if (progress) {
        progress.status = 'canceled';
        this.downloads.set(downloadId, progress);
      }
    }
  }

  getDownload(downloadId: string): DownloadProgress | undefined {
    return this.downloads.get(downloadId);
  }

  getActiveDownloads(): DownloadProgress[] {
    return Array.from(this.downloads.values()).filter(
      (d) => d.status === 'downloading' || d.status === 'pending'
    );
  }

  getAllDownloads(): DownloadProgress[] {
    return Array.from(this.downloads.values());
  }

  private parseETA(etaString: string): number {
    const parts = etaString.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  }
}

// Singleton instance
export const downloadManager = new DownloadManager();
