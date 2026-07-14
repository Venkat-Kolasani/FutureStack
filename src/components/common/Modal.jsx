import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  className = '',
}) => {
  // Close modal on Escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-white dark:bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className={`relative bg-white dark:bg-[#0A0A0A] rounded-t-2xl sm:rounded-xl shadow-xl border border-gray-200 dark:border-white/10 max-w-lg w-full ${className} transform transition-all`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-white/10">
              {title && <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Close modal"
                >
                  <FaTimes size={20} />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-4 sm:p-5 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;
