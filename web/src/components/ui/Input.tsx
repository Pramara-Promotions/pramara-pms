import React, { InputHTMLAttributes, forwardRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export type InputVariant = 'default' | 'success' | 'error';
export type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: InputVariant;
  inputSize?: InputSize;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      icon,
      iconRight,
      variant = 'default',
      inputSize = 'md',
      fullWidth = true,
      type = 'text',
      className = '',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    // Determine effective variant
    const effectiveVariant = error ? 'error' : success ? 'success' : variant;

    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-5 py-3.5 text-lg'
    };

    // Variant styles
    const variantStyles = {
      default: `
        border-gray-300 dark:border-neutral-700
        focus:border-indigo-500 dark:focus:border-purple-500
        focus:ring-4 focus:ring-indigo-500/20 dark:focus:ring-purple-500/20
      `,
      success: `
        border-emerald-500 dark:border-emerald-600
        focus:border-emerald-600 dark:focus:border-emerald-500
        focus:ring-4 focus:ring-emerald-500/20
        bg-emerald-50/50 dark:bg-emerald-950/20
      `,
      error: `
        border-red-500 dark:border-red-600
        focus:border-red-600 dark:focus:border-red-500
        focus:ring-4 focus:ring-red-500/20
        bg-red-50/50 dark:bg-red-950/20
      `
    };

    // Label animation styles
    const labelStyles = isFocused || props.value
      ? 'text-xs -translate-y-5 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-semibold'
      : 'text-sm text-gray-500 dark:text-neutral-500';

    const baseInputStyles = `
      w-full
      rounded-lg
      border-2
      bg-white dark:bg-neutral-900
      text-gray-900 dark:text-white
      placeholder-gray-400 dark:placeholder-neutral-600
      transition-all duration-200
      focus:outline-none
      disabled:opacity-50 disabled:cursor-not-allowed
      disabled:bg-gray-50 dark:disabled:bg-neutral-800
    `;

    const inputClasses = `
      ${baseInputStyles}
      ${sizeStyles[inputSize]}
      ${variantStyles[effectiveVariant]}
      ${icon ? 'pl-10' : ''}
      ${(iconRight || type === 'password') ? 'pr-10' : ''}
      ${className}
    `;

    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {/* Label */}
        {label && (
          <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-neutral-300">
            {label}
            {props.required && (
              <span className="ml-1 text-red-500">*</span>
            )}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Left Icon */}
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500">
              {icon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={inputClasses}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {/* Right Icon / Password Toggle / Status Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            )}
            {iconRight && !error && !success && (
              <span className="text-gray-400 dark:text-neutral-500">
                {iconRight}
              </span>
            )}
            {error && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            {success && !error && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            )}
          </div>
        </div>

        {/* Helper Text */}
        {(hint || error || success) && (
          <div className="mt-1.5 text-sm">
            {error && (
              <p className="text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
            {success && !error && (
              <p className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </p>
            )}
            {hint && !error && !success && (
              <p className="text-gray-500 dark:text-neutral-500">
                {hint}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

// Floating Label Input Variant
interface FloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string;
  success?: string;
  inputSize?: InputSize;
  fullWidth?: boolean;
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  (
    {
      label,
      error,
      success,
      inputSize = 'md',
      fullWidth = true,
      className = '',
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = props.value !== undefined && props.value !== '';

    const sizeStyles = {
      sm: 'px-3 pt-5 pb-1.5 text-sm',
      md: 'px-4 pt-6 pb-2 text-base',
      lg: 'px-5 pt-7 pb-2.5 text-lg'
    };

    const labelSizeStyles = {
      sm: 'text-xs top-1.5 peer-focus:text-xs peer-focus:top-1.5',
      md: 'text-sm top-2 peer-focus:text-xs peer-focus:top-2',
      lg: 'text-base top-2.5 peer-focus:text-sm peer-focus:top-2.5'
    };

    const effectiveVariant = error ? 'error' : success ? 'success' : 'default';

    const variantStyles = {
      default: `
        border-gray-300 dark:border-neutral-700
        focus:border-indigo-500 dark:focus:border-purple-500
        focus:ring-4 focus:ring-indigo-500/20
      `,
      success: `
        border-emerald-500
        focus:border-emerald-600
        focus:ring-4 focus:ring-emerald-500/20
        bg-emerald-50/30 dark:bg-emerald-950/20
      `,
      error: `
        border-red-500
        focus:border-red-600
        focus:ring-4 focus:ring-red-500/20
        bg-red-50/30 dark:bg-red-950/20
      `
    };

    const inputClasses = `
      peer
      w-full
      rounded-lg
      border-2
      bg-white dark:bg-neutral-900
      text-gray-900 dark:text-white
      placeholder-transparent
      transition-all duration-200
      focus:outline-none
      ${sizeStyles[inputSize]}
      ${variantStyles[effectiveVariant]}
      ${className}
    `;

    const labelClasses = `
      absolute left-4
      transition-all duration-200
      pointer-events-none
      ${labelSizeStyles[inputSize]}
      ${
        isFocused || hasValue
          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent font-semibold'
          : 'text-gray-500 dark:text-neutral-500'
      }
    `;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        <div className="relative">
          <input
            ref={ref}
            className={inputClasses}
            placeholder={label}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />
          <label className={labelClasses}>
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {/* Status Icons */}
          {(error || success) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {error && <AlertCircle className="w-5 h-5 text-red-500" />}
              {success && !error && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            </div>
          )}
        </div>

        {/* Error/Success Message */}
        {(error || success) && (
          <div className="mt-1.5 text-sm">
            {error && (
              <p className="text-red-600 dark:text-red-400">{error}</p>
            )}
            {success && !error && (
              <p className="text-emerald-600 dark:text-emerald-400">{success}</p>
            )}
          </div>
        )}
      </div>
    );
  }
);

FloatingInput.displayName = 'FloatingInput';
