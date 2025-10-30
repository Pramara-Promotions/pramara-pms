import React, { useState, useRef } from 'react';

export interface TouchFeedbackProps {
  children: React.ReactNode;
  onTap?: () => void;
  disabled?: boolean;
  rippleColor?: string;
  scaleOnPress?: boolean;
  haptic?: boolean; // Vibration feedback (if supported)
  className?: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  size: number;
}

/**
 * Component that provides touch feedback with ripple effect and scale animation
 * 
 * @example
 * ```tsx
 * <TouchFeedback onTap={() => console.log('Tapped!')}>
 *   <button>Click me</button>
 * </TouchFeedback>
 * ```
 */
export const TouchFeedback: React.FC<TouchFeedbackProps> = ({
  children,
  onTap,
  disabled = false,
  rippleColor = 'rgba(255, 255, 255, 0.3)',
  scaleOnPress = true,
  haptic = false,
  className = '',
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const nextRippleId = useRef(0);

  const triggerHaptic = () => {
    if (haptic && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
  };

  const createRipple = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;

    // Calculate size to cover the entire container
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple: Ripple = {
      id: nextRippleId.current++,
      x,
      y,
      size,
    };

    setRipples((prev) => [...prev, newRipple]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 600);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    setIsPressed(true);
    createRipple(e);
    triggerHaptic();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsPressed(true);
    createRipple(e);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (!disabled && onTap) {
      onTap();
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
    if (!disabled && onTap) {
      onTap();
    }
  };

  const handleTouchCancel = () => {
    setIsPressed(false);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => setIsPressed(false)}
      style={{
        transform: scaleOnPress && isPressed && !disabled ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.1s ease',
        WebkitTapHighlightColor: 'transparent', // Remove default touch highlight
      }}
    >
      {children}

      {/* Ripples */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="absolute pointer-events-none rounded-full animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            transform: 'translate(-50%, -50%) scale(0)',
            backgroundColor: rippleColor,
          }}
        />
      ))}
    </div>
  );
};

/**
 * Button with built-in touch feedback
 */
export interface TouchButtonProps extends Omit<TouchFeedbackProps, 'children'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}

export const TouchButton: React.FC<TouchButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon: Icon,
  loading = false,
  disabled = false,
  onTap,
  className = '',
  ...feedbackProps
}) => {
  const baseClasses = 'rounded-xl font-medium transition-colors flex items-center justify-center gap-2';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white',
    ghost: 'bg-transparent text-indigo-600 dark:text-indigo-400',
    danger: 'bg-red-600 text-white',
  };

  const sizeClasses = {
    sm: 'min-h-[40px] px-3 py-2 text-sm',
    md: 'min-h-[48px] px-4 py-3 text-base',
    lg: 'min-h-[56px] px-6 py-4 text-lg',
  };

  const buttonClasses = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim();

  return (
    <TouchFeedback
      onTap={onTap}
      disabled={disabled || loading}
      rippleColor={variant === 'primary' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)'}
      className={buttonClasses}
      {...feedbackProps}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {Icon && !loading && <Icon className="w-5 h-5" />}
      <span>{children}</span>
    </TouchFeedback>
  );
};

/**
 * Card with touch feedback (for list items, cards, etc.)
 */
export interface TouchCardProps extends TouchFeedbackProps {
  children: React.ReactNode;
  highlighted?: boolean;
  showChevron?: boolean;
}

export const TouchCard: React.FC<TouchCardProps> = ({
  children,
  highlighted = false,
  showChevron = false,
  className = '',
  ...feedbackProps
}) => {
  return (
    <TouchFeedback
      rippleColor="rgba(99, 102, 241, 0.1)"
      className={`
        bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700
        ${highlighted ? 'ring-2 ring-indigo-500' : ''}
        ${className}
      `.trim()}
      {...feedbackProps}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">{children}</div>
        {showChevron && (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </div>
    </TouchFeedback>
  );
};
