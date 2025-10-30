/**
 * Responsive Design Utilities
 * Mobile-first responsive helpers and constants
 */

// Touch target minimum size (iOS Human Interface Guidelines)
export const TOUCH_TARGET_MIN = {
  width: 44,
  height: 44,
} as const;

// Breakpoints (matching Tailwind defaults)
export const BREAKPOINTS = {
  sm: 640,   // Small devices (landscape phones)
  md: 768,   // Medium devices (tablets)
  lg: 1024,  // Large devices (desktops)
  xl: 1280,  // Extra large devices
  '2xl': 1536, // 2X Extra large devices
} as const;

// Device type detection
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.md;
}

export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg;
}

export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.lg;
}

// Touch detection
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Responsive class helpers
export const responsiveClasses = {
  // Touch-friendly button sizing
  button: 'min-h-[44px] min-w-[44px] px-4 py-2',
  buttonSmall: 'min-h-[44px] px-3 py-1.5',
  buttonLarge: 'min-h-[56px] px-6 py-3',
  
  // Container padding
  containerPadding: 'px-4 md:px-6 lg:px-8',
  
  // Section spacing
  sectionSpacing: 'py-6 md:py-8 lg:py-12',
  
  // Card spacing
  cardPadding: 'p-4 md:p-6',
  
  // Typography
  heading: 'text-2xl md:text-3xl lg:text-4xl',
  subheading: 'text-lg md:text-xl lg:text-2xl',
  body: 'text-sm md:text-base',
  
  // Grid layouts
  gridOneToTwo: 'grid grid-cols-1 md:grid-cols-2 gap-4',
  gridOneToThree: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  gridOneToFour: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  
  // Modal positioning
  modalMobile: 'fixed inset-x-0 bottom-0 rounded-t-2xl md:inset-0 md:m-auto md:max-w-2xl md:max-h-[90vh] md:rounded-xl',
  
  // Navigation
  navBottom: 'fixed bottom-0 left-0 right-0 md:relative md:inset-auto',
  navSide: 'hidden md:block md:w-64 lg:w-72',
} as const;

// Swipe gesture detection
export interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
}

export function useSwipeGesture(config: SwipeConfig) {
  const threshold = config.threshold || 50;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
  };

  const handleSwipe = () => {
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && config.onSwipeRight) {
        config.onSwipeRight();
      } else if (deltaX < 0 && config.onSwipeLeft) {
        config.onSwipeLeft();
      }
    }
    // Vertical swipes
    else if (Math.abs(deltaY) > threshold) {
      if (deltaY > 0 && config.onSwipeDown) {
        config.onSwipeDown();
      } else if (deltaY < 0 && config.onSwipeUp) {
        config.onSwipeUp();
      }
    }
  };

  return {
    handleTouchStart,
    handleTouchEnd,
  };
}

// Viewport height fix for mobile browsers (accounts for address bar)
export function useVhFix() {
  if (typeof window === 'undefined') return;
  
  const setVh = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setVh();
  window.addEventListener('resize', setVh);
  window.addEventListener('orientationchange', setVh);

  return () => {
    window.removeEventListener('resize', setVh);
    window.removeEventListener('orientationchange', setVh);
  };
}

// Safe area insets for notched devices
export function getSafeAreaInsets() {
  if (typeof window === 'undefined' || !CSS.supports) return null;
  
  return {
    top: CSS.supports('padding-top: env(safe-area-inset-top)') 
      ? 'env(safe-area-inset-top)'
      : '0px',
    right: CSS.supports('padding-right: env(safe-area-inset-right)')
      ? 'env(safe-area-inset-right)'
      : '0px',
    bottom: CSS.supports('padding-bottom: env(safe-area-inset-bottom)')
      ? 'env(safe-area-inset-bottom)'
      : '0px',
    left: CSS.supports('padding-left: env(safe-area-inset-left)')
      ? 'env(safe-area-inset-left)'
      : '0px',
  };
}
