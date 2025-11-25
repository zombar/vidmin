import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { FileSelector } from '../FileSelector';

// Mock window.electron
const mockSelectFile = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(window, {
    electron: {
      ipcRenderer: {
        invoke: vi.fn(),
        on: vi.fn(),
        removeListener: vi.fn(),
      },
      video: {
        selectFile: mockSelectFile,
        getMetadata: vi.fn(),
      },
    },
  });
});

afterEach(() => {
  cleanup();
});

describe.sequential('FileSelector Component', () => {
  it('should render select button', () => {
    const onFileSelected = vi.fn();
    render(<FileSelector onFileSelected={onFileSelected} />);

    expect(screen.getByTestId('select-file-button')).toBeInTheDocument();
    expect(screen.getByText('Select Video File')).toBeInTheDocument();
  });

  it('should display supported formats hint', () => {
    const onFileSelected = vi.fn();
    render(<FileSelector onFileSelected={onFileSelected} />);

    expect(screen.getByText(/Supported formats/i)).toBeInTheDocument();
    expect(screen.getByText(/MP4.*WebM.*MKV.*AVI.*MOV.*FLV.*WMV.*TS.*MPG.*MPEG.*VOB/i)).toBeInTheDocument();
  });

  it('should call onFileSelected when file is selected', async () => {
    const onFileSelected = vi.fn();
    const mockFileData = {
      filename: 'test.mp4',
      path: '/path/to/test.mp4',
      size: 1024,
      format: 'mp4',
      url: 'vidmin:/path/to/test.mp4',
      createdAt: new Date(),
      modifiedAt: new Date(),
    };

    mockSelectFile.mockResolvedValue(mockFileData);

    render(<FileSelector onFileSelected={onFileSelected} />);

    const button = screen.getByTestId('select-file-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(onFileSelected).toHaveBeenCalledWith(mockFileData);
    }, { timeout: 2000 });
  });

  it('should not call onFileSelected when selection is canceled', async () => {
    const onFileSelected = vi.fn();
    mockSelectFile.mockResolvedValue(null);

    render(<FileSelector onFileSelected={onFileSelected} />);

    const button = screen.getByTestId('select-file-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockSelectFile).toHaveBeenCalled();
    }, { timeout: 2000 });

    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it('should show selecting state during file selection', async () => {
    const onFileSelected = vi.fn();
    let resolveSelect: (value: null) => void;
    const selectPromise = new Promise<null>((resolve) => {
      resolveSelect = resolve;
    });

    mockSelectFile.mockReturnValue(selectPromise);

    render(<FileSelector onFileSelected={onFileSelected} />);

    const button = screen.getByTestId('select-file-button');
    fireEvent.click(button);

    expect(screen.getByText('Selecting...')).toBeInTheDocument();
    expect(button).toBeDisabled();

    resolveSelect!(null);

    await waitFor(() => {
      expect(screen.getByText('Select Video File')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
