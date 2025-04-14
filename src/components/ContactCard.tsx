import React, { useState, useEffect } from 'react';
import { Phone, Mail, MessageSquare } from 'lucide-react';

interface ContactCardProps {
  whatsapp?: string;
  phone?: string;
  email?: string;
  className?: string;
}

const ContactCard: React.FC<ContactCardProps> = ({
  whatsapp,
  phone,
  email,
  className = ''
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);
  
  // Format the phone number for WhatsApp
  const formatWhatsApp = (number?: string) => {
    return number ? number.replace(/[\s+\-()]/g, '') : '';
  };

  const handleWhatsAppClick = () => {
    if (whatsapp) {
      window.open(`https://wa.me/${formatWhatsApp(whatsapp)}`, '_blank');
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

  if (isMobile) {
    return (
      <div className={`w-full ${className}`}>
        <div className="relative">
          <button
            className="w-full py-3 px-4 bg-[#CEFA05] text-black rounded-full font-medium flex items-center justify-center"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Contact Now
          </button>

          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-lg shadow-xl z-10 overflow-hidden transform origin-top transition-all duration-200">
              {whatsapp && (
                <button
                  className="w-full py-3 px-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center"
                  onClick={handleWhatsAppClick}
                >
                  <MessageSquare className="h-5 w-5 mr-3 text-gray-600" />
                  <span className="font-medium">WhatsApp</span>
                </button>
              )}
              
              {(phone || whatsapp) && (
                <button
                  className="w-full py-3 px-4 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors flex items-center"
                  onClick={handleCallClick}
                >
                  <Phone className="h-5 w-5 mr-3 text-gray-600" />
                  <span className="font-medium">Call</span>
                </button>
              )}
              
              {email && (
                <button
                  className="w-full py-3 px-4 text-left hover:bg-gray-50 transition-colors flex items-center"
                  onClick={handleEmailClick}
                >
                  <Mail className="h-5 w-5 mr-3 text-gray-600" />
                  <span className="font-medium">Email</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {whatsapp && (
        <button
          className="py-2 px-4 bg-[#CEFA05] text-black rounded-lg hover:bg-opacity-90 transition-colors flex items-center"
          onClick={handleWhatsAppClick}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          WhatsApp
        </button>
      )}
      
      {(phone || whatsapp) && (
        <button
          className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          onClick={handleCallClick}
        >
          <Phone className="h-4 w-4 mr-2" />
          Call
        </button>
      )}
      
      {email && (
        <button
          className="py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          onClick={handleEmailClick}
        >
          <Mail className="h-4 w-4 mr-2" />
          Email
        </button>
      )}
    </div>
  );
};

export default ContactCard;