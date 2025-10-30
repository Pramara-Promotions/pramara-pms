import { useRef, useEffect, RefObject } from 'react';

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeConfig {
  onSwipe?: (direction: SwipeDirection) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minSwipeDistance?: number; // Minimum distance for swipe detection (default: 50px)
  maxSwipeTime?: number; // Maximum time for swipe (default: 300ms)
  preventScroll?: boolean; // Prevent scroll during swipe (default: false)
}

export interface SwipeState {
  isSwiping: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  direction: SwipeDirection | null;
}

/**
 * Hook to detect swipe gestures on a target element
 * 
 * @example
 * ```tsx
 * const targetRef = useRef<HTMLDivElement>(null);
 * const swipeState = useSwipe(targetRef, {
 *   onSwipeLeft: () => console.log('Swiped left!'),
 *   onSwipeRight: () => console.log('Swiped right!'),
 *   minSwipeDistance: 50,
 * });
 * 
 * return (
 *   <div ref={targetRef}>
 *     {swipeState.isSwiping && <div>Swiping...</div>}
 *   </div>
 * );
 * ```
 */
export function useSwipe<T extends HTMLElement = HTMLElement>(
  targetRef: RefObject<T>,
  config: SwipeConfig = {}
): SwipeState {
  const {
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    preventScroll = false,
  } = config;

  const stateRef = useRef<SwipeState>({
    isSwiping: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    direction: null,
  });

  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      stateRef.current = {
        isSwiping: true,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX: 0,
        deltaY: 0,
        direction: null,
      };
      startTimeRef.current = Date.now();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!stateRef.current.isSwiping) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - stateRef.current.startX;
      const deltaY = touch.clientY - stateRef.current.startY;

      stateRef.current = {
        ...stateRef.current,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX,
        deltaY,
      };

      // Prevent scroll if configured
      if (preventScroll && Math.abs(deltaX) > 10) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!stateRef.current.isSwiping) return;

      const deltaX = stateRef.current.deltaX;
      const deltaY = stateRef.current.deltaY;
      const swipeTime = Date.now() - startTimeRef.current;

      // Check if swipe meets criteria
      if (swipeTime <= maxSwipeTime) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);

        // Determine primary direction
        if (absX > absY && absX > minSwipeDistance) {
          // Horizontal swipe
          const direction: SwipeDirection = deltaX > 0 ? 'right' : 'left';
          stateRef.current.direction = direction;

          onSwipe?.(direction);
          if (direction === 'left') {
            onSwipeLeft?.();
          } else {
            onSwipeRight?.();
          }
        } else if (absY > absX && absY > minSwipeDistance) {
          // Vertical swipe
          const direction: SwipeDirection = deltaY > 0 ? 'down' : 'up';
          stateRef.current.direction = direction;

          onSwipe?.(direction);
          if (direction === 'up') {
            onSwipeUp?.();
          } else {
            onSwipeDown?.();
          }
        }
      }

      // Reset state
      stateRef.current.isSwiping = false;
    };

    // Mouse events for desktop testing
    let isMouseDown = false;

    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      stateRef.current = {
        isSwiping: true,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        deltaX: 0,
        deltaY: 0,
        direction: null,
      };
      startTimeRef.current = Date.now();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown || !stateRef.current.isSwiping) return;

      const deltaX = e.clientX - stateRef.current.startX;
      const deltaY = e.clientY - stateRef.current.startY;

      stateRef.current = {
        ...stateRef.current,
        currentX: e.clientX,
        currentY: e.clientY,
        deltaX,
        deltaY,
      };
    };

    const handleMouseUp = () => {
      if (!isMouseDown) return;
      isMouseDown = false;
      handleTouchEnd();
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd);

    element.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);

      element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    minSwipeDistance,
    maxSwipeTime,
    preventScroll,
  ]);

  return stateRef.current;
}

/**
 * Hook for swipeable list items (e.g., swipe to delete)
 * 
 * @example
 * ```tsx
 * const { bind, style } = useSwipeableItem({
 *   onSwipeLeft: () => setShowDelete(true),
 *   onSwipeRight: () => setShowArchive(true),
 * });
 * 
 * return (
 *   <div {...bind} style={style}>
 *     Swipe me!
 *   </div>
 * );
 * ```
 */
export function useSwipeableItem(config: SwipeConfig) {
  const elementRef = useRef<HTMLDivElement>(null);
  const swipeState = useSwipe(elementRef as RefObject<HTMLDivElement>, {
    ...config,
    preventScroll: true,
  });

  const style: React.CSSProperties = swipeState.isSwiping
    ? {
        transform: `translateX(${swipeState.deltaX}px)`,
        transition: 'none',
      }
    : {
        transform: 'translateX(0)',
        transition: 'transform 0.3s ease',
      };

  return {
    ref: elementRef,
    bind: { ref: elementRef },
    style,
    swipeState,
  };
}

/**
 * Hook for carousel/slider navigation
 * 
 * @example
 * ```tsx
 * const { currentIndex, goToNext, goToPrev, bind } = useSwipeableCarousel({
 *   itemCount: items.length,
 *   onChange: (index) => console.log('Slide', index),
 * });
 * ```
 */
export function useSwipeableCarousel(options: {
  itemCount: number;
  initialIndex?: number;
  onChange?: (index: number) => void;
  loop?: boolean;
}) {
  const { itemCount, initialIndex = 0, onChange, loop = true } = options;
  const currentIndex = useRef(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  const goToIndex = (index: number) => {
    if (index < 0 || index >= itemCount) {
      if (loop) {
        index = (index + itemCount) % itemCount;
      } else {
        return;
      }
    }

    currentIndex.current = index;
    onChange?.(index);
  };

  const goToNext = () => goToIndex(currentIndex.current + 1);
  const goToPrev = () => goToIndex(currentIndex.current - 1);

  useSwipe(containerRef as RefObject<HTMLDivElement>, {
    onSwipeLeft: goToNext,
    onSwipeRight: goToPrev,
    minSwipeDistance: 50,
    preventScroll: true,
  });

  return {
    ref: containerRef,
    bind: { ref: containerRef },
    currentIndex: currentIndex.current,
    goToIndex,
    goToNext,
    goToPrev,
  };
}
