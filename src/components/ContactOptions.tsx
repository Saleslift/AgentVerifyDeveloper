import React, { useState } from 'react';
import { MessageSquare, Phone, Mail, X } from 'lucide-react';
import Modal from './Modal';

interface ContactOptionsProps {
  whatsapp?: string;
  email?: string;
  phone?: string;
}

export default function ContactOptions({ whatsapp, email, phone }: ContactOptionsProps) {
  const [showModal, setShowModal] = useState(false);

  const handleWhatsAppClick = () => {
    if (whatsapp) {
      window.open(`https://wa.me/${whatsapp.replace(/\+/g, '')}`, '_blank');
    }
  };

  const handleCallClick = () => {
    if (phone || whatsapp) {
      window.location.href = `tel:${phone || whatsapp}`;
    }
  };

  const handleEmailClick = () => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <>
      {/* Desktop View */}
      <div className="hidden lg:flex items-center space-x-3">
        <button
          onClick={handleWhatsAppClick}
          disabled={!whatsapp}
          className="inline-flex items-center px-3 py-2 bg-[#cefa05] text-black rounded-lg hover:bg-[#b9e500] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Contact via WhatsApp"
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          <span>WhatsApp</span>
        </button>
        <button
          onClick={handleCallClick}
          disabled={!phone && !whatsapp}
          className="inline-flex items-center px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Call agent"
        >
          <Phone className="h-5 w-5 mr-2" />
          <span>Call</span>
        </button>
        <button
          onClick={handleEmailClick}
          disabled={!email}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Email agent"
        >
          <Mail className="h-5 w-5 mr-2" />
          <span>Email</span>
        </button>
      </div>

      {/* Mobile View */}
      <button
        onClick={() => setShowModal(true)}
        className="lg:hidden inline-flex items-center px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors"
        aria-label="Connect with agent"
      >
        <MessageSquare className="h-5 w-5 mr-2" />
        Connect with me
      </button>

      {/* Modal for Mobile */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Let's Connect"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <button
              onClick={handleWhatsAppClick}
              disabled={!whatsapp}
              className="flex items-center justify-center w-full px-4 py-3 bg-[#cefa05] text-black rounded-lg hover:bg-[#b9e500] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Contact via WhatsApp"
            >
              <MessageSquare className="h-5 w-5 mr-3" />
              WhatsApp
            </button>
            
            <button
              onClick={handleCallClick}
              disabled={!phone && !whatsapp}
              className="flex items-center justify-center w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Call agent"
            >
              <Phone className="h-5 w-5 mr-3" />
              Call
            </button>
            
            <button
              onClick={handleEmailClick}
              disabled={!email}
              className="flex items-center justify-center w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Email agent"
            >
              <Mail className="h-5 w-5 mr-3" />
              Email
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}