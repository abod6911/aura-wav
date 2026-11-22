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
  activeColor = 'bg-[#FA2D48]',
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
        boxSizing: 'border-box',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute rounded-full bg-white shadow-md pointer-events-none transition-[left] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          top: `${pad}px`,
          left: leftPos,
          width: `${knobSize}px`,
          height: `${knobSize}px`,
          transform: 'translateZ(0)',
        }}
      />
    </button>
  );
};
