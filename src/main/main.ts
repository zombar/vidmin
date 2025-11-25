import { app, BrowserWindow, protocol } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { setupIpcHandlers } from './ipc-handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Register custom protocol scheme before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'vidmin',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true, // Critical for video streaming
      corsEnabled: true,
    },
  },
]);

// Helper function to determine MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4',
    '.flv': 'video/x-flv',
    '.wmv': 'video/x-ms-wmv',
    '.ts': 'video/mp2t',
    '.m2ts': 'video/mp2t',
    '.mts': 'video/mp2t',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.vob': 'video/mpeg',
  };
  return mimeTypes[ext] || 'video/mp4';
}

// Helper function to validate file path security
function isPathAllowed(filePath: string): boolean {
  const normalizedPath = path.normalize(filePath);

  // Allow access to common video directories
  const allowedDirs = [
    app.getPath('videos'),
    app.getPath('downloads'),
    app.getPath('home'),
    app.getPath('desktop'),
    app.getPath('documents'),
  ];

  // On macOS and Windows, file systems are case-insensitive
  // So we do case-insensitive comparison
  const isCaseInsensitiveFS = process.platform === 'darwin' || process.platform === 'win32';

  if (isCaseInsensitiveFS) {
    const lowerPath = normalizedPath.toLowerCase();
    return allowedDirs.some(dir => lowerPath.startsWith(dir.toLowerCase()));
  }

  return allowedDirs.some(dir => normalizedPath.startsWith(dir));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 700,
    title: 'Vidmin Player',
    frame: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register custom protocol handler for local video files
  protocol.handle('vidmin', async (request) => {
    // Extract file path from vidmin:/path/to/file.mp4
    // Remove the protocol prefix (vidmin:)
    let urlPath = request.url.replace(/^vidmin:\/*/g, '');

    // Ensure path starts with / for absolute paths
    if (!urlPath.startsWith('/')) {
      urlPath = '/' + urlPath;
    }

    // Decode URI components (handles spaces and special characters)
    const filePath = decodeURIComponent(urlPath);

    // eslint-disable-next-line no-console
    console.log('[Protocol] Request URL:', request.url);
    // eslint-disable-next-line no-console
    console.log('[Protocol] Extracted path:', filePath);

    // Security check: validate file path
    if (!isPathAllowed(filePath)) {
      console.error('[Protocol] Access denied to path:', filePath);
      console.error('[Protocol] Allowed directories:', [
        app.getPath('videos'),
        app.getPath('downloads'),
        app.getPath('home'),
        app.getPath('desktop'),
        app.getPath('documents'),
      ]);
      // eslint-disable-next-line no-undef
      return new Response('Forbidden: Access to this path is not allowed', { status: 403 });
    }

    // On case-insensitive file systems (macOS/Windows), the path may have wrong case
    // We need to find the actual file with correct casing
    let actualFilePath = filePath;

    // Check if file exists (case-insensitive on macOS/Windows)
    if (!fs.existsSync(filePath)) {
      console.error('[Protocol] File not found:', filePath);
      // eslint-disable-next-line no-undef
      return new Response('File not found', { status: 404 });
    }

    // Get the real path with correct casing (resolves symlinks and fixes case)
    try {
      actualFilePath = fs.realpathSync(filePath);
      // eslint-disable-next-line no-console
      console.log('[Protocol] Resolved real path:', actualFilePath);
    } catch (err) {
      console.error('[Protocol] Error resolving real path:', err);
      // Continue with original path if realpathSync fails
    }

    try {
      const stats = fs.statSync(actualFilePath);
      const fileSize = stats.size;
      const mimeType = getMimeType(actualFilePath);

      // Parse Range header for video seeking support
      const rangeHeader = request.headers.get('range');

      if (rangeHeader) {
        // Handle range request (used for video seeking)
        const parts = rangeHeader.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;

        // eslint-disable-next-line no-console
        console.log('[Protocol] Range request:', { start, end, chunkSize, fileSize });

        const fileStream = fs.createReadStream(actualFilePath, { start, end });

        // eslint-disable-next-line no-undef
        return new Response(fileStream as any, {
          status: 206, // Partial Content
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize.toString(),
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache',
          },
        });
      }

      // Handle normal full file request
      // eslint-disable-next-line no-console
      console.log('[Protocol] Full file request:', { fileSize, mimeType });

      const fileStream = fs.createReadStream(actualFilePath);

      // eslint-disable-next-line no-undef
      return new Response(fileStream as any, {
        status: 200,
        headers: {
          'Accept-Ranges': 'bytes',
          'Content-Length': fileSize.toString(),
          'Content-Type': mimeType,
          'Cache-Control': 'no-cache',
        },
      });
    } catch (error) {
      console.error('[Protocol] Error serving file:', error);
      // eslint-disable-next-line no-undef
      return new Response(`Internal server error: ${(error as Error).message}`, { status: 500 });
    }
  });

  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
