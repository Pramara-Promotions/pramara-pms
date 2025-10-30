import { useState, useEffect } from 'react';

// Breakpoint definitions matching Tailwind defaults
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const;

export type Breakpoint = keyof typeof breakpoints;

// Hook to detect current breakpoint
export function useBreakpoint() {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>('2xl');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < breakpoints.sm) {
        setCurrentBreakpoint('sm');
      } else if (width < breakpoints.md) {
        setCurrentBreakpoint('md');
      } else if (width < breakpoints.lg) {
        setCurrentBreakpoint('lg');
      } else if (width < breakpoints.xl) {
        setCurrentBreakpoint('xl');
      } else {
        setCurrentBreakpoint('2xl');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return currentBreakpoint;
}

// Hook to check if screen is mobile
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoints.lg);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

// Hook to check if screen is tablet
export function useIsTablet() {
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth;
      setIsTablet(width >= breakpoints.md && width < breakpoints.lg);
    };

    checkTablet();
    window.addEventListener('resize', checkTablet);
    return () => window.removeEventListener('resize', checkTablet);
  }, []);

  return isTablet;
}

// Hook to detect touch device
export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return isTouch;
}

// Hook to get screen orientation
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(
        window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
      );
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);
    
    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}

// Hook for responsive value
export function useResponsiveValue<T>(values: {
  base: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}): T {
  const breakpoint = useBreakpoint();

  // Return the appropriate value based on current breakpoint
  if (breakpoint === '2xl' && values['2xl']) return values['2xl'];
  if ((breakpoint === 'xl' || breakpoint === '2xl') && values.xl) return values.xl;
  if ((breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl') && values.lg) return values.lg;
  if ((breakpoint === 'md' || breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl') && values.md) return values.md;
  if (values.sm) return values.sm;
  
  return values.base;
}

// Hook to detect swipe gestures
export function useSwipe(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    });
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;

    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

    if (isHorizontalSwipe) {
      if (deltaX > threshold) {
        onSwipeLeft?.();
      } else if (deltaX < -threshold) {
        onSwipeRight?.();
      }
    } else {
      if (deltaY > threshold) {
        onSwipeUp?.();
      } else if (deltaY < -threshold) {
        onSwipeDown?.();
      }
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
}

// Hook to prevent body scroll (for modals on mobile)
export function usePreventScroll(prevent: boolean) {
  useEffect(() => {
    if (prevent) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [prevent]);
}

// Hook for safe area insets (for notched phones)
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  });

  useEffect(() => {
    const updateSafeArea = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeArea({
        top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0')
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

  return safeArea;
}
