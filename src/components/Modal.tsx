import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEsc = true
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Handle click outside to close
  useEffect(() => {
    if (!closeOnOverlayClick) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, closeOnOverlayClick]);
  
  // Handle escape key to close
  useEffect(() => {
    if (!closeOnEsc) return;
    
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose, closeOnEsc]);
  
  // Don't render anything if modal is closed
  if (!isOpen) return null;
  
  // Use portal to render modal at the root level of the DOM
  return createPortal(
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 animate-fade-in-up touch-none"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? "modal-title" : undefined}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div 
        ref={modalRef}
        className={`bg-white rounded-xl w-full ${maxWidth} shadow-xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        {(title || showCloseButton) && (
          <div className="flex justify-between items-center p-5 border-b border-gray-100">
            {title && <h3 id="modal-title" className="text-xl font-bold">{title}</h3>}
            {showCloseButton && (
              <button 
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        )}
        
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;