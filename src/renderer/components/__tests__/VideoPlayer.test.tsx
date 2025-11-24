import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VideoPlayer } from '../VideoPlayer';

// Mock Vidstack components
vi.mock('@vidstack/react', () => ({
  MediaPlayer: ({ children }: any) => <div data-testid="media-player">{children}</div>,
  MediaProvider: () => <div data-testid="media-provider" />,
}));

vi.mock('@vidstack/react/player/layouts/default', () => ({
  DefaultVideoLayout: () => <div data-testid="default-layout" />,
  defaultLayoutIcons: {},
}));

describe('VideoPlayer Component', () => {
  it('should render empty state when no video URL provided', () => {
    render(<VideoPlayer />);
    expect(screen.getByTestId('video-player-empty')).toBeInTheDocument();
    expect(screen.getByText('No video loaded')).toBeInTheDocument();
  });

  it('should render player container when video URL provided', () => {
    render(<VideoPlayer videoUrl="test.mp4" />);
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
  });

  it('should display filename when provided', () => {
    render(<VideoPlayer videoUrl="test.mp4" filename="test-video.mp4" />);
    expect(screen.getByTestId('video-filename')).toBeInTheDocument();
    expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
  });

  it('should not display filename overlay when filename not provided', () => {
    render(<VideoPlayer videoUrl="test.mp4" />);
    expect(screen.queryByTestId('video-filename')).not.toBeInTheDocument();
  });
});
