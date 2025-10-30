// Page Transition Component
import React, { useEffect, useState } from 'react';
import { animations, useReducedMotion } from '../../utils/animations';

export interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div
      className={`
        ${reducedMotion ? '' : isVisible ? animations.pageEnter : 'opacity-0'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default PageTransition;
