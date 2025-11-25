import { useState } from 'react';
import './ConversionDialog.css';

interface ConversionDialogProps {
  inputPath: string;
  inputFormat: string;
  onConvert: (outputFormat: 'mp4' | 'webm', quality: 'high' | 'medium' | 'low') => void;
  onCancel: () => void;
  progress?: number;
  status?: 'idle' | 'loading' | 'converting' | 'error';
  error?: string;
}

export function ConversionDialog({
  inputPath,
  inputFormat,
  onConvert,
  onCancel,
  progress = 0,
  status = 'idle',
  error,
}: ConversionDialogProps) {
  const [outputFormat, setOutputFormat] = useState<'mp4' | 'webm'>('mp4');
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('medium');

  const handleConvert = () => {
    onConvert(outputFormat, quality);
  };

  const isConverting = status === 'loading' || status === 'converting';
  const filename = inputPath.split('/').pop() || inputPath;

  return (
    <div className="conversion-dialog-overlay" data-testid="conversion-dialog">
      <div className="conversion-dialog">
        <h2>Convert Video Format</h2>

        <p>
          This video format ({inputFormat.toUpperCase()}) may not play correctly in all browsers.
          Would you like to convert it to a more compatible format?
        </p>

        <div className="format-info">
          <div className="format-info-row">
            <span className="format-label">File:</span>
            <span className="format-value">{filename}</span>
          </div>
          <div className="format-info-row">
            <span className="format-label">Current Format:</span>
            <span className="format-value">{inputFormat.toUpperCase()}</span>
          </div>
        </div>

        {!isConverting && !error && (
          <div className="conversion-options">
            <div className="option-group">
              <label htmlFor="output-format">Output Format:</label>
              <select
                id="output-format"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as 'mp4' | 'webm')}
                data-testid="output-format-select"
              >
                <option value="mp4">MP4 (H.264 + AAC)</option>
                <option value="webm">WebM (VP9 + Opus)</option>
              </select>
            </div>

            <div className="option-group">
              <label htmlFor="quality">Quality:</label>
              <select
                id="quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value as 'high' | 'medium' | 'low')}
                data-testid="quality-select"
              >
                <option value="high">High (Larger file, best quality)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="low">Low (Smaller file, faster)</option>
              </select>
            </div>
          </div>
        )}

        {isConverting && (
          <div className="conversion-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
                data-testid="conversion-progress-bar"
              >
                {progress > 10 && `${progress}%`}
              </div>
            </div>
            <div className="progress-text">
              {status === 'loading' ? 'Loading FFmpeg...' : `Converting... ${progress}%`}
            </div>
          </div>
        )}

        {error && (
          <div className="conversion-error" data-testid="conversion-error">
            <strong>Conversion Failed:</strong> {error}
          </div>
        )}

        <div className="dialog-actions">
          {!isConverting && (
            <>
              <button
                className="dialog-button dialog-button-secondary"
                onClick={onCancel}
                data-testid="cancel-button"
              >
                {error ? 'Close' : 'Cancel'}
              </button>
              {!error && (
                <button
                  className="dialog-button dialog-button-primary"
                  onClick={handleConvert}
                  data-testid="convert-button"
                >
                  Convert
                </button>
              )}
            </>
          )}
          {isConverting && (
            <button
              className="dialog-button dialog-button-secondary"
              onClick={onCancel}
              data-testid="cancel-conversion-button"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
