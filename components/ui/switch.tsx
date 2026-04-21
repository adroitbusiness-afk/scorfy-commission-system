// components/ui/switch.tsx
'use client';

import { forwardRef, useState, useId } from 'react';

export interface SwitchProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'red' | 'purple' | 'gray';
  label?: string;
  labelPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
}

const sizeStyles = {
  sm: { button: 'h-5 w-9', thumb: 'h-3 w-3', thumbTranslate: 'translate-x-4' },
  md: { button: 'h-6 w-11', thumb: 'h-4 w-4', thumbTranslate: 'translate-x-6' },
  lg: { button: 'h-7 w-12', thumb: 'h-5 w-5', thumbTranslate: 'translate-x-6' },
};

const colorStyles = {
  blue: 'bg-blue-600 focus:ring-blue-500',
  green: 'bg-green-600 focus:ring-green-500',
  red: 'bg-red-600 focus:ring-red-500',
  purple: 'bg-purple-600 focus:ring-purple-500',
  gray: 'bg-gray-600 focus:ring-gray-500',
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked: controlledChecked,
      defaultChecked = false,
      onCheckedChange,
      size = 'md',
      color = 'blue',
      label,
      labelPosition = 'right',
      loading = false,
      disabled = false,
      className = '',
      id: externalId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = externalId || generatedId;
    const [uncontrolledChecked, setUncontrolledChecked] = useState(defaultChecked);
    const isControlled = controlledChecked !== undefined;
    const currentChecked = isControlled ? controlledChecked : uncontrolledChecked;

    const toggle = () => {
      if (disabled || loading) return;
      const newChecked = !currentChecked;
      if (!isControlled) setUncontrolledChecked(newChecked);
      onCheckedChange?.(newChecked);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    };

    const { button: buttonSize, thumb: thumbSize, thumbTranslate } = sizeStyles[size];
    const activeColor = colorStyles[color];
    const isChecked = currentChecked;

    const switchElement = (
      <button
        ref={ref}
        id={id}
        type="button"
        role="switch"
        aria-checked={isChecked}
        aria-disabled={disabled || loading}
        aria-label={label || props['aria-label'] || 'Toggle switch'}
        disabled={disabled || loading}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex shrink-0 items-center rounded-full transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900
          ${buttonSize}
          ${isChecked ? activeColor : 'bg-gray-300 dark:bg-gray-600'}
          ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        {...props}
      >
        <span
          className={`
            inline-block rounded-full bg-white shadow-md transform transition-transform duration-200
            ${thumbSize}
            ${isChecked ? thumbTranslate : 'translate-x-0.5'}
          `}
        />
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        )}
      </button>
    );

    if (!label) return switchElement;

    return (
      <div className={`flex items-center gap-2 ${labelPosition === 'left' ? 'flex-row-reverse justify-end' : ''}`}>
        {switchElement}
        <label
          htmlFor={id}
          className={`text-sm font-medium select-none cursor-pointer ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {label}
        </label>
      </div>
    );
  }
);

Switch.displayName = 'Switch';