import React, { useState } from 'react';

export default function Footer() {
  const [showLegal, setShowLegal] = useState(false);

  return (
    <footer className="bg-black text-white py-4 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <div className="relative w-9 h-9">
              <img 
                src="https://edcsftvorssaojmyfqgs.supabase.co/storage/v1/object/public/homepage-assets//png%20100%20x%20100%20(1).png"
                alt="AgentVerify Logo"
                className="w-full h-full object-contain"
                width={36}
                height={36}
              />
            </div>
          </div>

          {/* Legal Links */}
          <div className="relative">
            <button
              onClick={() => setShowLegal(!showLegal)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Legal
            </button>

            {/* Legal Dropdown */}
            {showLegal && (
              <div className="absolute bottom-full right-0 mb-2 bg-black rounded-lg shadow-2xl border border-white/10 backdrop-blur-sm">
                <div className="divide-y divide-white/10">
                  <a
                    href="/privacy"
                    className="block px-6 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    Privacy Policy
                  </a>
                  <a
                    href="/terms"
                    className="block px-6 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    Terms of Service
                  </a>
                  <a
                    href="/cookies"
                    className="block px-6 py-3 text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    Cookie Policy
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}