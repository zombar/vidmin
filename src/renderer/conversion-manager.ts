import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface ConversionProgress {
  id: string;
  inputPath: string;
  outputPath: string;
  status: 'pending' | 'loading' | 'converting' | 'completed' | 'error' | 'canceled';
  progress: number;
  error?: string;
}

export interface ConversionOptions {
  inputPath: string;
  outputPath: string;
  outputFormat: 'mp4' | 'webm';
  quality?: 'high' | 'medium' | 'low';
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export class ConversionManager {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private conversions: Map<string, ConversionProgress> = new Map();

  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    this.ffmpeg = new FFmpeg();

    // Load ffmpeg core from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    this.ffmpeg.on('log', ({ message }) => {
      // eslint-disable-next-line no-console
      console.log('[FFmpeg]', message);
    });

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.isLoaded = true;
  }

  async convertVideo(options: ConversionOptions): Promise<string> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.initialize();
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg failed to initialize');
    }

    const conversionId = `conv_${Date.now()}`;
    const inputFileName = 'input.' + this.getFileExtension(options.inputPath);
    const outputFileName = 'output.' + options.outputFormat;

    const conversion: ConversionProgress = {
      id: conversionId,
      inputPath: options.inputPath,
      outputPath: options.outputPath,
      status: 'loading',
      progress: 0,
    };

    this.conversions.set(conversionId, conversion);

    try {
      // Read the input file using custom vidmin: protocol
      const inputData = await fetchFile(`vidmin:${options.inputPath}`);
      await this.ffmpeg.writeFile(inputFileName, inputData);

      conversion.status = 'converting';
      this.conversions.set(conversionId, conversion);

      // Set up progress tracking
      this.ffmpeg.on('progress', ({ progress }) => {
        conversion.progress = Math.round(progress * 100);
        this.conversions.set(conversionId, conversion);
        options.onProgress?.(conversion.progress);
      });

      // Build ffmpeg command based on output format and quality
      const args = this.buildFFmpegArgs(inputFileName, outputFileName, options);

      // Execute conversion
      await this.ffmpeg.exec(args);

      // Read the output file
      const data = await this.ffmpeg.readFile(outputFileName);

      // Write to output path - data is a Uint8Array
      await window.electron.file.writeFile(options.outputPath, data as Uint8Array);

      // Clean up
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      conversion.status = 'completed';
      conversion.progress = 100;
      this.conversions.set(conversionId, conversion);
      options.onComplete?.();

      return options.outputPath;
    } catch (error) {
      conversion.status = 'error';
      conversion.error = (error as Error).message;
      this.conversions.set(conversionId, conversion);
      options.onError?.(error as Error);
      throw error;
    }
  }

  private buildFFmpegArgs(
    inputFileName: string,
    outputFileName: string,
    options: ConversionOptions
  ): string[] {
    const args = ['-i', inputFileName];

    if (options.outputFormat === 'mp4') {
      // H.264 video codec, AAC audio codec
      args.push('-c:v', 'libx264');
      args.push('-c:a', 'aac');

      // Quality settings
      switch (options.quality) {
        case 'high':
          args.push('-crf', '18');
          args.push('-preset', 'slow');
          break;
        case 'low':
          args.push('-crf', '28');
          args.push('-preset', 'ultrafast');
          break;
        default: // medium
          args.push('-crf', '23');
          args.push('-preset', 'medium');
      }
    } else if (options.outputFormat === 'webm') {
      // VP9 video codec, Opus audio codec
      args.push('-c:v', 'libvpx-vp9');
      args.push('-c:a', 'libopus');

      // Quality settings
      switch (options.quality) {
        case 'high':
          args.push('-crf', '15');
          args.push('-b:v', '0');
          break;
        case 'low':
          args.push('-crf', '35');
          args.push('-b:v', '0');
          break;
        default: // medium
          args.push('-crf', '25');
          args.push('-b:v', '0');
      }
    }

    args.push(outputFileName);
    return args;
  }

  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts[parts.length - 1].toLowerCase();
  }

  getConversion(id: string): ConversionProgress | undefined {
    return this.conversions.get(id);
  }

  needsConversion(format: string): boolean {
    // Only flag formats that are definitively incompatible with browser playback
    // MKV, MOV, and other containers may work if they contain compatible codecs
    // Let the player attempt to load first before forcing conversion
    const definitelyUnsupportedFormats = ['flv', 'wmv', 'avi', 'mpg', 'mpeg', 'vob', 'ts', 'm2ts', 'mts', '3gp', 'rm', 'rmvb'];
    return definitelyUnsupportedFormats.includes(format.toLowerCase());
  }

  getSupportedFormats(): string[] {
    return ['mp4', 'webm'];
  }
}

// Singleton instance
export const conversionManager = new ConversionManager();
