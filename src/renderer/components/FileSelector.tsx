import { useState } from 'react';
import './FileSelector.css';

interface FileSelectorProps {
  onFileSelected: (fileData: any) => void;
}

export function FileSelector({ onFileSelected }: FileSelectorProps) {
  const [isSelecting, setIsSelecting] = useState(false);

  const handleSelectFile = async () => {
    setIsSelecting(true);
    try {
      const fileData = await window.electron.video.selectFile();
      if (fileData) {
        onFileSelected(fileData);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="file-selector" data-testid="file-selector">
      <button
        onClick={handleSelectFile}
        disabled={isSelecting}
        data-testid="select-file-button"
        className="select-file-button"
      >
        {isSelecting ? 'Selecting...' : 'Select Video File'}
      </button>
      <p className="file-selector-hint">
        Supported formats: MP4, WebM, MKV, AVI, MOV
      </p>
    </div>
  );
}
