// Fade In component with Intersection Observer
import React from 'react';
import { useInView, animations, useReducedMotion } from '../../utils/animations';

export interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number;
}

const FadeIn: React.FC<FadeInProps> = ({
  children,
  className = '',
  threshold = 0.1,
  direction = 'none',
  delay = 0,
}) => {
  const { ref, isInView } = useInView({ threshold });
  const reducedMotion = useReducedMotion();

  const getAnimationClass = () => {
    if (reducedMotion || !isInView) return 'opacity-0';
    
    switch (direction) {
      case 'up':
        return animations.slideInUp;
      case 'down':
        return animations.slideInDown;
      case 'left':
        return animations.slideInLeft;
      case 'right':
        return animations.slideInRight;
      default:
        return animations.pageEnter;
    }
  };

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`
        transition-all duration-500
        ${getAnimationClass()}
        ${className}
      `}
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: 'both',
      }}
    >
      {children}
    </div>
  );
};

export default FadeIn;
