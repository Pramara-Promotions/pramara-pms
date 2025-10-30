import React from 'react';
import { useIsMobile, useIsTablet } from '../../hooks/useResponsive';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  mobileNav?: React.ReactNode;
  className?: string;
}

export default function ResponsiveLayout({
  children,
  sidebar,
  header,
  mobileNav,
  className = ''
}: ResponsiveLayoutProps) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-neutral-950 ${className}`}>
      {/* Header - shown on all devices */}
      {header && (
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-lg border-b border-gray-200 dark:border-neutral-800">
          {header}
        </header>
      )}

      <div className="flex">
        {/* Sidebar - hidden on mobile, collapsible on tablet, persistent on desktop */}
        {sidebar && !isMobile && (
          <aside className={`
            ${isTablet ? 'w-16' : 'w-64'}
            flex-shrink-0
            border-r border-gray-200 dark:border-neutral-800
            bg-white dark:bg-neutral-900
            sticky top-16 h-[calc(100vh-4rem)]
            overflow-y-auto
            transition-all duration-300
          `}>
            {sidebar}
          </aside>
        )}

        {/* Main content area */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      {/* Mobile navigation - shown only on mobile */}
      {mobileNav && isMobile && mobileNav}
    </div>
  );
}

// Container with responsive padding
interface ContainerProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
}

export function Container({ children, size = 'xl', className = '' }: ContainerProps) {
  const maxWidths = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    full: 'max-w-full'
  };

  return (
    <div className={`
      ${maxWidths[size]}
      mx-auto
      px-4 sm:px-6 lg:px-8
      ${className}
    `}>
      {children}
    </div>
  );
}

// Responsive grid
interface GridProps {
  children: React.ReactNode;
  cols?: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

export function Grid({
  children,
  cols = { base: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  className = ''
}: GridProps) {
  const gridCols = `
    grid-cols-${cols.base || 1}
    ${cols.sm ? `sm:grid-cols-${cols.sm}` : ''}
    ${cols.md ? `md:grid-cols-${cols.md}` : ''}
    ${cols.lg ? `lg:grid-cols-${cols.lg}` : ''}
    ${cols.xl ? `xl:grid-cols-${cols.xl}` : ''}
  `;

  return (
    <div className={`grid ${gridCols} gap-${gap} ${className}`}>
      {children}
    </div>
  );
}

// Responsive stack (vertical on mobile, horizontal on desktop)
interface StackProps {
  children: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  spacing?: number;
  breakpoint?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Stack({
  children,
  direction = 'horizontal',
  spacing = 4,
  breakpoint = 'md',
  className = ''
}: StackProps) {
  const baseDirection = direction === 'horizontal' ? 'flex-row' : 'flex-col';
  const mobileDirection = 'flex-col';
  
  return (
    <div className={`
      flex ${mobileDirection} ${breakpoint}:${baseDirection}
      gap-${spacing}
      ${className}
    `}>
      {children}
    </div>
  );
}

// Split view (list + detail pattern)
interface SplitViewProps {
  list: React.ReactNode;
  detail: React.ReactNode;
  showDetail: boolean;
  onBackToList?: () => void;
  listWidth?: string;
}

export function SplitView({
  list,
  detail,
  showDetail,
  onBackToList,
  listWidth = 'w-1/3'
}: SplitViewProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="relative">
        {/* List view */}
        <div className={`${showDetail ? 'hidden' : 'block'}`}>
          {list}
        </div>

        {/* Detail view */}
        {showDetail && (
          <div className="fixed inset-0 bg-white dark:bg-neutral-900 z-40 overflow-y-auto">
            {/* Back button */}
            {onBackToList && (
              <button
                onClick={onBackToList}
                className="
                  sticky top-0 z-10
                  w-full
                  px-4 py-3
                  flex items-center gap-2
                  bg-white/95 dark:bg-neutral-900/95
                  backdrop-blur-lg
                  border-b border-gray-200 dark:border-neutral-800
                  text-indigo-600 dark:text-indigo-400
                  font-medium
                  active:bg-gray-50 dark:active:bg-neutral-800
                "
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
            )}
            {detail}
          </div>
        )}
      </div>
    );
  }

  // Desktop: side-by-side view
  return (
    <div className="flex h-full">
      <div className={`${listWidth} border-r border-gray-200 dark:border-neutral-800 overflow-y-auto`}>
        {list}
      </div>
      <div className="flex-1 overflow-y-auto">
        {detail}
      </div>
    </div>
  );
}

// Touch-friendly button (minimum 44x44px)
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
}

export function TouchButton({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}: TouchButtonProps) {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md active:shadow-sm',
    secondary: 'bg-white dark:bg-neutral-800 border-2 border-gray-300 dark:border-neutral-700 text-gray-900 dark:text-white',
    ghost: 'bg-transparent text-gray-700 dark:text-neutral-300 active:bg-gray-100 dark:active:bg-neutral-800'
  };

  return (
    <button
      className={`
        min-h-[44px] min-w-[44px]
        px-6 py-3
        rounded-lg
        font-semibold
        active:scale-95
        transition-all duration-200
        ${variants[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
