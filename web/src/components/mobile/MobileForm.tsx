import React, { useRef, useEffect } from 'react';
import { useIsMobile } from '@/hooks/useResponsive';

export interface MobileFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  preventZoom?: boolean; // Prevent iOS zoom on input focus
}

/**
 * Form wrapper with mobile optimizations
 * - Prevents iOS zoom on input focus
 * - Scrolls focused input into view
 * - Touch-friendly spacing
 */
export const MobileForm: React.FC<MobileFormProps> = ({
  children,
  onSubmit,
  className = '',
  preventZoom = true,
}) => {
  const isMobile = useIsMobile();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isMobile || !preventZoom) return;

    // Add viewport meta tag to prevent zoom
    const viewport = document.querySelector('meta[name="viewport"]');
    const originalContent = viewport?.getAttribute('content');

    if (viewport && preventZoom) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
      );
    }

    return () => {
      if (viewport && originalContent) {
        viewport.setAttribute('content', originalContent);
      }
    };
  }, [isMobile, preventZoom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Blur active input to dismiss keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    onSubmit(e);
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={`space-y-4 ${className}`}
    >
      {children}
    </form>
  );
};

/**
 * Mobile-optimized input field
 */
export interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const MobileInput: React.FC<MobileInputProps> = ({
  label,
  error,
  helperText,
  icon: Icon,
  className = '',
  ...inputProps
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // Scroll input into view when focused
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isMobile && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300); // Wait for keyboard to appear
    }

    inputProps.onFocus?.(e);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-5 h-5 text-gray-400" />
          </div>
        )}

        <input
          ref={inputRef}
          {...inputProps}
          onFocus={handleFocus}
          className={`
            w-full
            ${Icon ? 'pl-10' : 'pl-4'}
            pr-4
            ${isMobile ? 'py-3 text-base min-h-[48px]' : 'py-2 text-sm'}
            rounded-xl
            border
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'}
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-white
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none
            focus:ring-2
            focus:ring-offset-0
            disabled:opacity-50
            disabled:cursor-not-allowed
            transition-all
            ${className}
          `}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

/**
 * Mobile-optimized textarea
 */
export interface MobileTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  autoResize?: boolean;
}

export const MobileTextarea: React.FC<MobileTextareaProps> = ({
  label,
  error,
  helperText,
  autoResize = false,
  className = '',
  ...textareaProps
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isMobile = useIsMobile();

  // Auto-resize textarea
  useEffect(() => {
    if (!autoResize || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    };

    textarea.addEventListener('input', adjustHeight);
    adjustHeight(); // Initial adjustment

    return () => textarea.removeEventListener('input', adjustHeight);
  }, [autoResize]);

  // Scroll into view when focused
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (isMobile && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 300);
    }

    textareaProps.onFocus?.(e);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <textarea
        ref={textareaRef}
        {...textareaProps}
        onFocus={handleFocus}
        className={`
          w-full
          px-4
          ${isMobile ? 'py-3 text-base min-h-[96px]' : 'py-2 text-sm min-h-[80px]'}
          rounded-xl
          border
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'}
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-500
          focus:outline-none
          focus:ring-2
          focus:ring-offset-0
          disabled:opacity-50
          disabled:cursor-not-allowed
          resize-none
          transition-all
          ${className}
        `}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

/**
 * Mobile-optimized select dropdown
 */
export interface MobileSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export const MobileSelect: React.FC<MobileSelectProps> = ({
  label,
  error,
  helperText,
  options,
  className = '',
  ...selectProps
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          {...selectProps}
          className={`
            w-full
            appearance-none
            px-4
            pr-10
            ${isMobile ? 'py-3 text-base min-h-[48px]' : 'py-2 text-sm'}
            rounded-xl
            border
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500'}
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-white
            focus:outline-none
            focus:ring-2
            focus:ring-offset-0
            disabled:opacity-50
            disabled:cursor-not-allowed
            transition-all
            ${className}
          `}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {helperText && !error && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};
