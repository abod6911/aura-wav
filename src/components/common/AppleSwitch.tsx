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

  // Dimensions:
  // sm: track 44px x 24px (w-11 h-6), knob 20px x 20px (w-5 h-5), travel: 2px -> 22px (44 - 20 - 2 = 22px)
  // md: track 48px x 28px (w-12 h-7), knob 24px x 24px (w-6 h-6), travel: 2px -> 22px (48 - 24 - 2 = 22px)
  const isSm = size === 'sm';
  const trackClass = isSm ? 'w-11 h-6' : 'w-12 h-7';
  const knobClass = isSm ? 'w-5 h-5' : 'w-6 h-6';
  const leftPos = checked ? '22px' : '2px';

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={handleClick}
      dir="ltr"
      className={`relative inline-flex ${trackClass} shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 select-none active:scale-95 focus:outline-none ${
        checked ? activeColor : inactiveColor
      }`}
      style={{ direction: 'ltr' }}
    >
      <span
        aria-hidden="true"
        className={`absolute top-0.5 ${knobClass} rounded-full bg-white shadow-md pointer-events-none transition-[left] duration-240 ease-[cubic-bezier(0.16,1,0.3,1)]`}
        style={{
          left: leftPos,
          transform: 'translateZ(0)',
        }}
      />
    </button>
  );
};
