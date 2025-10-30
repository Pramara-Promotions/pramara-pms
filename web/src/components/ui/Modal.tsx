import React, { useEffect, HTMLAttributes } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnBackdrop?: boolean;
  showCloseButton?: boolean;
  footer?: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  closeOnBackdrop = true,
  showCloseButton = true,
  footer
}: ModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  return (
    <>
      {/* Backdrop with gradient overlay */}
      <div
        className="
          fixed inset-0 z-50
          bg-gradient-to-br from-black/60 via-black/50 to-indigo-900/40
          backdrop-blur-sm
          animate-in fade-in duration-200
        "
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Modal Content with glass morphism */}
          <div
            className={`
              relative w-full ${sizeStyles[size]}
              bg-white/95 dark:bg-neutral-900/95
              backdrop-blur-xl
              rounded-2xl
              shadow-2xl
              border border-white/20 dark:border-neutral-700/50
              transform
              animate-in zoom-in-95 slide-in-from-bottom-4 duration-300
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with gradient border */}
            {(title || showCloseButton) && (
              <div className="
                relative
                px-6 py-4
                border-b-2 border-transparent
                bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
                bg-clip-border
              ">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {title && (
                      <h2 className="
                        text-xl font-bold
                        bg-gradient-to-r from-indigo-600 to-purple-600
                        dark:from-indigo-400 dark:to-purple-400
                        bg-clip-text text-transparent
                      ">
                        {title}
                      </h2>
                    )}
                    {subtitle && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">
                        {subtitle}
                      </p>
                    )}
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="
                        ml-4 p-2 rounded-lg
                        text-gray-400 hover:text-gray-600
                        dark:text-neutral-500 dark:hover:text-neutral-300
                        hover:bg-gray-100 dark:hover:bg-neutral-800
                        transition-all duration-200
                        hover:scale-110 active:scale-95
                      "
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Body */}
            <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="
                px-6 py-4
                border-t border-gray-200 dark:border-neutral-800
                bg-gray-50/50 dark:bg-neutral-900/50
                rounded-b-2xl
              ">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Confirmation Modal variant
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'info',
  loading = false
}: ConfirmModalProps) {
  const variantConfig = {
    danger: {
      icon: '🔴',
      gradient: 'from-red-600 to-rose-600',
      bg: 'bg-red-50 dark:bg-red-950/30'
    },
    warning: {
      icon: '⚠️',
      gradient: 'from-amber-600 to-orange-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30'
    },
    info: {
      icon: 'ℹ️',
      gradient: 'from-indigo-600 to-purple-600',
      bg: 'bg-indigo-50 dark:bg-indigo-950/30'
    }
  };

  const config = variantConfig[variant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnBackdrop={!loading}
      showCloseButton={!loading}
    >
      <div className="text-center">
        <div className={`
          w-16 h-16 mx-auto mb-4 rounded-full
          ${config.bg}
          flex items-center justify-center
          text-3xl
        `}>
          {config.icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="
              px-6 py-2.5 rounded-lg
              border-2 border-gray-300 dark:border-neutral-700
              text-gray-700 dark:text-neutral-300
              hover:bg-gray-100 dark:hover:bg-neutral-800
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
            "
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`
              px-6 py-2.5 rounded-lg
              bg-gradient-to-r ${config.gradient}
              text-white font-semibold
              shadow-md hover:shadow-lg
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              hover:-translate-y-0.5
              flex items-center gap-2
            `}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
