// Animated Button Component
import React, { useState } from 'react';
import { Loader } from 'lucide-react';
import { animations, createRipple, useReducedMotion } from '../../utils/animations';

export interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  ripple?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  success = false,
  error = false,
  ripple = true,
  icon,
  children,
  className = '',
  onClick,
  disabled,
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const reducedMotion = useReducedMotion();

  const getVariantClasses = () => {
    if (loading) return 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed';
    if (success) return 'bg-gradient-to-r from-green-500 to-green-600 animate-pulse-success';
    if (error) return 'bg-gradient-to-r from-red-500 to-red-600 animate-shake';

    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white';
      case 'secondary':
        return 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300';
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white';
      case 'danger':
        return 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white';
      case 'ghost':
        return 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300';
      default:
        return '';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) return;

    if (ripple && !reducedMotion) {
      createRipple(e);
    }

    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 100);

    onClick?.(e);
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`
        relative overflow-hidden rounded-lg font-medium
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${!reducedMotion && !loading && !disabled ? animations.buttonClick : ''}
        ${!reducedMotion && !loading && !disabled ? animations.lift : ''}
        ${className}
      `}
      style={{
        transform: isPressed && !reducedMotion ? 'scale(0.95)' : undefined,
      }}
    >
      <span className="flex items-center justify-center gap-2">
        {loading ? (
          <Loader className={`${animations.spinner} ${size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'}`} />
        ) : icon}
        {children}
      </span>
    </button>
  );
};

export default AnimatedButton;
