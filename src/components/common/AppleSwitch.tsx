import React from 'react';

export interface AppleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  activeColor?: string;
  inactiveColor?: string;
  label?: string;
  id?: string;
  size?: 'sm' | 'md';
}

/**
 * Bulletproof iOS-style Toggle Switch
 * Uses absolute pixel-bounded geometry with hardware-accelerated transitions
 * Guaranteed to NEVER overflow, pop out, or misalign regardless of RTL/LTR direction.
 */
export const AppleSwitch: React.FC<AppleSwitchProps> = ({
  checked,
  onChange,
  activeColor = 'bg-[#1DB954]',
  inactiveColor = 'bg-white/15',
  label,
  id,
  size = 'sm',
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    onChange(!checked);
  };

  const isSm = size === 'sm';
  const width = isSm ? 44 : 50;
  const height = isSm ? 24 : 28;
  const knobSize = isSm ? 20 : 24;
  const pad = 2;
  const travel = width - knobSize - pad; // 44 - 20 - 2 = 22px
  const leftPos = checked ? `${travel}px` : `${pad}px`;

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={handleClick}
      dir="ltr"
      className={`relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 select-none active:scale-95 focus:outline-none overflow-hidden ${
        checked ? activeColor : inactiveColor
      }`}
      style={{
        direction: 'ltr',
        width: `${width}px`,
        height: `${height}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        minHeight: `${height}px`,
        maxHeight: `${height}px`,
        padding: 0,
        margin: 0,
        boxSizing: 'border-box',
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute rounded-full bg-white shadow-md pointer-events-none"
        style={{
          position: 'absolute',
          top: `${pad}px`,
          left: leftPos,
          right: 'auto',
          bottom: 'auto',
          margin: 0,
          padding: 0,
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          borderRadius: '9999px',
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
          transition: 'left 200ms cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'none',
          transform: 'translateZ(0)',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      />
    </button>
  );
};
