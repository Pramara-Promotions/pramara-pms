// Animation Utilities
import { useEffect, useRef, useState } from 'react';

/**
 * Detect if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook to respect user's motion preferences
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(prefersReducedMotion());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
}

/**
 * Animation classes utility
 */
export const animations = {
  // Page transitions
  pageEnter: 'animate-fade-in',
  pageExit: 'animate-fade-out',
  slideForward: 'animate-slide-in-right',
  slideBack: 'animate-slide-in-left',
  slideInUp: 'animate-slide-in-up',
  slideInDown: 'animate-slide-in-down',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  
  // List animations
  listItem: 'animate-fade-in',
  stagger: (index: number) => ({
    animationDelay: `${index * 50}ms`
  }),
  
  // Button feedback
  buttonClick: 'active:scale-95 transition-transform duration-100',
  buttonSuccess: 'animate-pulse-success',
  buttonError: 'animate-shake',
  buttonLoading: 'opacity-50 cursor-not-allowed',
  
  // Form feedback
  inputFocus: 'focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all',
  inputValid: 'border-green-500 dark:border-green-400',
  inputInvalid: 'border-red-500 dark:border-red-400 animate-shake',
  
  // Hover effects
  lift: 'hover:animate-lift hover:shadow-lg transition-all duration-200',
  scale: 'hover:scale-105 transition-transform duration-200',
  glow: 'hover:shadow-glow-primary transition-shadow duration-200',
  
  // Loading
  shimmer: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
  spinner: 'animate-spin',
  pulse: 'animate-pulse',
  
  // Modals
  modalEnter: 'animate-scale-in',
  modalExit: 'animate-scale-out',
  backdropEnter: 'animate-fade-in',
  backdropExit: 'animate-fade-out',
  
  // Toast
  toastEnter: 'animate-slide-in-down',
  toastExit: 'animate-slide-in-up',
  
  // Bottom sheet
  sheetEnter: 'animate-slide-up',
  sheetExit: 'animate-slide-in-down',
} as const;

/**
 * Get animation class with reduced motion support
 */
export function getAnimation(animationKey: keyof typeof animations, reducedMotion: boolean = false): string {
  if (reducedMotion || prefersReducedMotion()) {
    return ''; // No animation if reduced motion is preferred
  }
  return animations[animationKey] as string;
}

/**
 * Stagger animation utility
 */
export function useStaggerAnimation(itemCount: number, delay: number = 50) {
  const reducedMotion = useReducedMotion();
  
  return (index: number) => {
    if (reducedMotion) return {};
    return {
      animationDelay: `${index * delay}ms`,
      animationFillMode: 'both'
    };
  };
}

/**
 * Intersection Observer hook for scroll animations
 */
export function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated) {
        setIsInView(true);
        setHasAnimated(true);
      }
    }, options);

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [hasAnimated, options]);

  return { ref, isInView };
}

/**
 * Auto-dismiss timer hook
 */
export function useAutoDismiss(onDismiss: () => void, duration: number = 5000, paused: boolean = false) {
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  useEffect(() => {
    if (paused) {
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      return;
    }

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const totalElapsed = duration - remainingTimeRef.current + elapsed;
      const newProgress = Math.min((totalElapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        onDismiss();
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [onDismiss, duration, paused]);

  return progress;
}

/**
 * Ripple effect utility
 */
export function createRipple(event: React.MouseEvent<HTMLElement>, color: string = 'rgba(255, 255, 255, 0.5)') {
  const button = event.currentTarget;
  const ripple = document.createElement('span');
  const rect = button.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.position = 'absolute';
  ripple.style.borderRadius = '50%';
  ripple.style.backgroundColor = color;
  ripple.style.pointerEvents = 'none';
  ripple.style.animation = 'ripple 0.6s ease-out';
  ripple.classList.add('animate-ripple');

  button.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

/**
 * Confetti animation utility (for success states)
 */
export function triggerConfetti(element: HTMLElement) {
  const colors = ['#6b6ef2', '#e84d64', '#22c55e', '#f59e0b', '#3b82f6'];
  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    const color = colors[Math.floor(Math.random() * colors.length)];
    const size = Math.random() * 8 + 4;
    const angle = (Math.random() * 360 * Math.PI) / 180;
    const velocity = Math.random() * 200 + 100;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity - 200;

    particle.style.position = 'fixed';
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.backgroundColor = color;
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.left = `${element.getBoundingClientRect().left + element.offsetWidth / 2}px`;
    particle.style.top = `${element.getBoundingClientRect().top + element.offsetHeight / 2}px`;
    particle.style.zIndex = '9999';

    document.body.appendChild(particle);

    let posX = 0;
    let posY = 0;
    let velocityX = vx / 60;
    let velocityY = vy / 60;
    const gravity = 15 / 60;
    let opacity = 1;

    const animate = () => {
      velocityY += gravity;
      posX += velocityX;
      posY += velocityY;
      opacity -= 0.02;

      particle.style.transform = `translate(${posX}px, ${posY}px)`;
      particle.style.opacity = `${opacity}`;

      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        particle.remove();
      }
    };

    requestAnimationFrame(animate);
  }
}

export default {
  animations,
  getAnimation,
  useReducedMotion,
  useStaggerAnimation,
  useInView,
  useAutoDismiss,
  createRipple,
  triggerConfetti,
};
