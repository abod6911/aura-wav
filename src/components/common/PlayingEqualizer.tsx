import React from 'react';

interface PlayingEqualizerProps {
  isPlaying?: boolean;
  color?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

/**
 * Hardware-accelerated (scaleY only) 4-bar audio equalizer indicator
 * matching Apple Music / Spotify Now Playing bar animations.
 */
export const PlayingEqualizer: React.FC<PlayingEqualizerProps> = ({
  isPlaying = true,
  color = '#1DB954',
  size = 'sm',
  className = '',
}) => {
  const dimensions =
    size === 'xs'
      ? 'h-3 gap-[1.5px]'
      : size === 'md'
      ? 'h-4 gap-[2.5px]'
      : 'h-3.5 gap-[2px]';

  const barWidth = size === 'xs' ? 'w-[2px]' : size === 'md' ? 'w-[3px]' : 'w-[2.5px]';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-end ${dimensions} ${className}`}
    >
      <span
        className={`${barWidth} h-full rounded-full eq-bar-1 ${!isPlaying ? 'eq-paused' : ''}`}
        style={{ backgroundColor: color }}
      />
      <span
        className={`${barWidth} h-full rounded-full eq-bar-2 ${!isPlaying ? 'eq-paused' : ''}`}
        style={{ backgroundColor: color }}
      />
      <span
        className={`${barWidth} h-full rounded-full eq-bar-3 ${!isPlaying ? 'eq-paused' : ''}`}
        style={{ backgroundColor: color }}
      />
      <span
        className={`${barWidth} h-full rounded-full eq-bar-4 ${!isPlaying ? 'eq-paused' : ''}`}
        style={{ backgroundColor: color }}
      />
    </span>
  );
};
