// Animated List Component with stagger effect
import React, { Children, ElementType } from 'react';
import { useStaggerAnimation, useReducedMotion } from '../../utils/animations';

export interface AnimatedListProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}

const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  delay = 50,
  className = '',
  as: Component = 'div',
}) => {
  const childrenArray = Children.toArray(children);
  const getStaggerStyle = useStaggerAnimation(childrenArray.length, delay);
  const reducedMotion = useReducedMotion();

  return (
    <Component className={className}>
      {childrenArray.map((child, index) => (
        <div
          key={index}
          className={reducedMotion ? '' : 'animate-fade-in'}
          style={getStaggerStyle(index)}
        >
          {child}
        </div>
      ))}
    </Component>
  );
};

export default AnimatedList;
