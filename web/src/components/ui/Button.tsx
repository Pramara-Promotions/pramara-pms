import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2 text-base gap-2',
      lg: 'px-6 py-3 text-lg gap-2.5',
      xl: 'px-8 py-4 text-xl gap-3'
    };

    // Variant styles
    const variantStyles = {
      primary: `
        bg-gradient-to-r from-indigo-600 to-purple-600
        hover:from-indigo-700 hover:to-purple-700
        active:from-indigo-800 active:to-purple-800
        text-white font-semibold
        shadow-md hover:shadow-lg active:shadow-sm
        ring-2 ring-indigo-500/20 hover:ring-indigo-500/40
        transform hover:-translate-y-0.5 active:translate-y-0
      `,
      secondary: `
        bg-white dark:bg-neutral-900
        border-2 border-transparent
        bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text
        hover:border-indigo-500 dark:hover:border-purple-500
        active:border-indigo-600 dark:active:border-purple-600
        text-transparent font-semibold
        shadow-sm hover:shadow-md active:shadow-sm
        ring-1 ring-gray-200 dark:ring-neutral-700
        hover:ring-indigo-500/30 dark:hover:ring-purple-500/30
        transform hover:-translate-y-0.5 active:translate-y-0
      `,
      ghost: `
        bg-transparent hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50
        dark:hover:from-indigo-950/30 dark:hover:to-purple-950/30
        text-gray-700 dark:text-neutral-300
        hover:text-indigo-700 dark:hover:text-indigo-400
        font-medium
        active:scale-95
      `,
      danger: `
        bg-gradient-to-r from-red-600 to-rose-600
        hover:from-red-700 hover:to-rose-700
        active:from-red-800 active:to-rose-800
        text-white font-semibold
        shadow-md hover:shadow-lg active:shadow-sm
        ring-2 ring-red-500/20 hover:ring-red-500/40
        transform hover:-translate-y-0.5 active:translate-y-0
      `,
      success: `
        bg-gradient-to-r from-emerald-600 to-green-600
        hover:from-emerald-700 hover:to-green-700
        active:from-emerald-800 active:to-green-800
        text-white font-semibold
        shadow-md hover:shadow-lg active:shadow-sm
        ring-2 ring-emerald-500/20 hover:ring-emerald-500/40
        transform hover:-translate-y-0.5 active:translate-y-0
      `
    };

    // Icon size mapping
    const iconSizeMap = {
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
      xl: 'w-6 h-6'
    };

    const baseStyles = `
      inline-flex items-center justify-center
      rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-4 focus:ring-indigo-500/30
      disabled:opacity-50 disabled:cursor-not-allowed
      disabled:transform-none disabled:shadow-none
      ${fullWidth ? 'w-full' : ''}
    `;

    const buttonClasses = `
      ${baseStyles}
      ${sizeStyles[size]}
      ${variantStyles[variant]}
      ${className}
    `;

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <Loader2 className={`${iconSizeMap[size]} animate-spin`} />
        )}
        {!loading && icon && (
          <span className={iconSizeMap[size]}>{icon}</span>
        )}
        {children}
        {!loading && iconRight && (
          <span className={iconSizeMap[size]}>{iconRight}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

// Icon Button variant
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  tooltip?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = 'ghost',
      size = 'md',
      loading = false,
      tooltip,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'w-8 h-8 p-1.5',
      md: 'w-10 h-10 p-2',
      lg: 'w-12 h-12 p-2.5',
      xl: 'w-14 h-14 p-3'
    };

    const variantStyles = {
      primary: `
        bg-gradient-to-br from-indigo-600 to-purple-600
        hover:from-indigo-700 hover:to-purple-700
        text-white
        shadow-md hover:shadow-lg
      `,
      secondary: `
        bg-white dark:bg-neutral-800
        border border-gray-200 dark:border-neutral-700
        hover:border-indigo-500 dark:hover:border-purple-500
        text-gray-700 dark:text-neutral-300
        hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50
        dark:hover:from-indigo-950/30 dark:hover:to-purple-950/30
      `,
      ghost: `
        bg-transparent
        hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-50
        dark:hover:from-neutral-800 dark:hover:to-neutral-800/50
        text-gray-600 dark:text-neutral-400
        hover:text-indigo-700 dark:hover:text-indigo-400
      `,
      danger: `
        bg-gradient-to-br from-red-600 to-rose-600
        hover:from-red-700 hover:to-rose-700
        text-white
        shadow-md hover:shadow-lg
      `,
      success: `
        bg-gradient-to-br from-emerald-600 to-green-600
        hover:from-emerald-700 hover:to-green-700
        text-white
        shadow-md hover:shadow-lg
      `
    };

    const iconSize = {
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-7 h-7'
    };

    const buttonClasses = `
      inline-flex items-center justify-center
      rounded-lg
      transition-all duration-200
      focus:outline-none focus:ring-4 focus:ring-indigo-500/30
      disabled:opacity-50 disabled:cursor-not-allowed
      transform hover:scale-110 active:scale-95
      ${sizeStyles[size]}
      ${variantStyles[variant]}
      ${className}
    `;

    return (
      <button
        ref={ref}
        className={buttonClasses}
        disabled={disabled || loading}
        title={tooltip}
        {...props}
      >
        {loading ? (
          <Loader2 className={`${iconSize[size]} animate-spin`} />
        ) : (
          <span className={iconSize[size]}>{icon}</span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
