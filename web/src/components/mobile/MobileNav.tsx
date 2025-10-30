import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MobileNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: number;
}

interface MobileNavProps {
  items: MobileNavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
}

export default function MobileNav({ items, activeId, onNavigate }: MobileNavProps) {
  return (
    <>
      {/* Bottom navigation - hidden on desktop */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
        <div className="
          bg-white/95 dark:bg-neutral-900/95
          backdrop-blur-lg
          border-t border-gray-200 dark:border-neutral-800
          shadow-lg
          safe-area-inset-bottom
        ">
          <div className="grid grid-cols-4 gap-1 px-2 py-2">
            {items.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const isActive = activeId === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`
                    relative
                    flex flex-col items-center justify-center
                    min-h-[44px] min-w-[44px]
                    px-3 py-2
                    rounded-lg
                    transition-all duration-200
                    ${isActive
                      ? 'text-white'
                      : 'text-gray-600 dark:text-neutral-400 active:scale-95'
                    }
                  `}
                >
                  {/* Active background gradient */}
                  {isActive && (
                    <div className="
                      absolute inset-0
                      bg-gradient-to-br from-indigo-600 to-purple-600
                      rounded-lg
                      shadow-md
                    " />
                  )}

                  {/* Icon */}
                  <div className="relative z-10 mb-0.5">
                    <Icon className="w-6 h-6" />
                    {item.badge && item.badge > 0 && (
                      <span className="
                        absolute -top-1 -right-1
                        min-w-[16px] h-4
                        px-1
                        flex items-center justify-center
                        text-[10px] font-bold
                        text-white
                        bg-gradient-to-r from-red-600 to-rose-600
                        rounded-full
                        ring-2 ring-white dark:ring-neutral-900
                      ">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <span className={`
                    relative z-10
                    text-[11px] font-medium
                    ${isActive ? 'text-white' : ''}
                  `}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind bottom nav */}
      <div className="h-16 lg:hidden" />
    </>
  );
}

// Mobile menu button for toggling sidebar
interface MobileMenuButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export function MobileMenuButton({ onClick, isOpen }: MobileMenuButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        lg:hidden
        p-2
        rounded-lg
        text-gray-600 dark:text-neutral-400
        hover:bg-gray-100 dark:hover:bg-neutral-800
        active:scale-95
        transition-all duration-200
      "
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      <div className="w-6 h-6 relative flex flex-col justify-center gap-1.5">
        <span className={`
          block h-0.5 w-6 bg-current
          transition-all duration-300
          ${isOpen ? 'rotate-45 translate-y-2' : ''}
        `} />
        <span className={`
          block h-0.5 w-6 bg-current
          transition-all duration-300
          ${isOpen ? 'opacity-0' : ''}
        `} />
        <span className={`
          block h-0.5 w-6 bg-current
          transition-all duration-300
          ${isOpen ? '-rotate-45 -translate-y-2' : ''}
        `} />
      </div>
    </button>
  );
}

// Mobile sidebar overlay
interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileSidebar({ isOpen, onClose, children }: MobileSidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="
            fixed inset-0 z-40
            bg-black/50
            backdrop-blur-sm
            lg:hidden
            animate-in fade-in duration-200
          "
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 bottom-0 z-50
          w-[280px] max-w-[80vw]
          bg-white dark:bg-neutral-900
          border-r border-gray-200 dark:border-neutral-800
          shadow-2xl
          transform transition-transform duration-300 ease-out
          lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {children}
      </div>
    </>
  );
}

// Bottom sheet modal for mobile
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoints?: number[]; // Percentage heights: [50, 100]
}

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoints = [90]
}: BottomSheetProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [startY, setStartY] = React.useState(0);
  const [currentY, setCurrentY] = React.useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = currentY - startY;
    // If dragged down more than 100px, close
    if (deltaY > 100) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const translateY = isDragging ? Math.max(0, currentY - startY) : 0;
  const maxHeight = snapPoints[0];

  return (
    <>
      {/* Backdrop */}
      <div
        className="
          fixed inset-0 z-50
          bg-black/50
          backdrop-blur-sm
          lg:hidden
          animate-in fade-in duration-200
        "
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className="
          fixed bottom-0 left-0 right-0 z-50
          bg-white dark:bg-neutral-900
          rounded-t-3xl
          shadow-2xl
          lg:hidden
          animate-in slide-in-from-bottom duration-300
        "
        style={{
          maxHeight: `${maxHeight}vh`,
          transform: `translateY(${translateY}px)`
        }}
      >
        {/* Drag Handle */}
        <div
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-neutral-700" />
        </div>

        {/* Header */}
        {title && (
          <div className="px-6 pb-4 border-b border-gray-200 dark:border-neutral-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)] px-6 py-4">
          {children}
        </div>
      </div>
    </>
  );
}

// Swipeable card for list items
interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    label: string;
    icon: LucideIcon;
    color: string;
  };
  rightAction?: {
    label: string;
    icon: LucideIcon;
    color: string;
  };
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction
}: SwipeableCardProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [currentX, setCurrentX] = React.useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaX = currentX - startX;
    const threshold = 80;

    // Swipe left (negative delta)
    if (deltaX < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }
    // Swipe right (positive delta)
    else if (deltaX > threshold && onSwipeRight) {
      onSwipeRight();
    }

    setCurrentX(startX);
  };

  const translateX = isDragging ? currentX - startX : 0;
  const showLeftAction = translateX > 20;
  const showRightAction = translateX < -20;

  return (
    <div className="relative overflow-hidden">
      {/* Left action background */}
      {leftAction && showLeftAction && (
        <div className={`
          absolute inset-y-0 left-0
          flex items-center px-6
          ${leftAction.color}
        `}>
          <leftAction.icon className="w-6 h-6 text-white" />
          <span className="ml-2 text-white font-semibold">
            {leftAction.label}
          </span>
        </div>
      )}

      {/* Right action background */}
      {rightAction && showRightAction && (
        <div className={`
          absolute inset-y-0 right-0
          flex items-center px-6
          ${rightAction.color}
        `}>
          <span className="mr-2 text-white font-semibold">
            {rightAction.label}
          </span>
          <rightAction.icon className="w-6 h-6 text-white" />
        </div>
      )}

      {/* Card content */}
      <div
        className="relative bg-white dark:bg-neutral-900 touch-pan-y"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
