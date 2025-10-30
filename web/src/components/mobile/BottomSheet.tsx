import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/useResponsive';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
  closeOnBackdrop?: boolean;
  closeOnSwipeDown?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
  height = 'auto',
  showHandle = true,
  closeOnBackdrop = true,
  closeOnSwipeDown = true,
}) => {
  const isMobile = useIsMobile();
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!closeOnSwipeDown) return;
    isDraggingRef.current = true;
    startYRef.current = e.touches[0].clientY;
    currentYRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!closeOnSwipeDown || !isDraggingRef.current) return;

    const deltaY = e.touches[0].clientY - startYRef.current;
    
    // Only allow dragging down (positive deltaY)
    if (deltaY > 0) {
      currentYRef.current = deltaY;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    }
  };

  const handleTouchEnd = () => {
    if (!closeOnSwipeDown || !isDraggingRef.current) return;

    isDraggingRef.current = false;

    // If dragged down more than 100px, close
    if (currentYRef.current > 100) {
      onClose();
    } else {
      // Snap back
      if (sheetRef.current) {
        sheetRef.current.style.transform = '';
      }
    }

    currentYRef.current = 0;
  };

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose();
    }
  };

  if (!isOpen) return null;

  // On desktop, render as centered modal
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        />

        {/* Modal */}
        <div
          className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in"
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // On mobile, render as bottom sheet
  const heightClass = {
    auto: 'max-h-[90vh]',
    half: 'h-[50vh]',
    full: 'h-[95vh]',
  }[height];

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/80 backdrop-blur-sm animate-fade-in"
        onClick={handleBackdropClick}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`relative w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl ${heightClass} animate-slide-up pb-safe`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        {showHandle && (
          <div className="flex justify-center py-3">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: height === 'auto' ? 'calc(90vh - 80px)' : undefined }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// Preset bottom sheets for common use cases
export interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
    icon?: React.ComponentType<{ className?: string }>;
  }>;
  showCancel?: boolean;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  title,
  actions,
  showCancel = true,
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} height="auto">
      <div className="p-4 space-y-2">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-h-[48px] ${
                action.variant === 'danger'
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
                  : 'bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {Icon && <Icon className="w-5 h-5" />}
              <span className="font-medium">{action.label}</span>
            </button>
          );
        })}

        {showCancel && (
          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[48px]"
          >
            Cancel
          </button>
        )}
      </div>
    </BottomSheet>
  );
};

// Form bottom sheet with submit/cancel
export interface FormSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
}

export const FormSheet: React.FC<FormSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Submit',
  isSubmitting = false,
  submitDisabled = false,
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title} height="auto">
      <div className="p-6">
        {children}

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-h-[48px]"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitDisabled || isSubmitting}
            className="flex-1 px-4 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[48px]"
          >
            {isSubmitting ? 'Submitting...' : submitLabel}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
