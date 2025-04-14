import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Check } from 'lucide-react';

interface Market {
  id: string;
  name: string;
}

interface MarketSelectorProps {
  selectedMarkets: string[];
  onChange: (markets: string[]) => void;
  className?: string;
  disabled?: boolean;
}

const marketOptions: Market[] = [
  { id: 'luxury', name: 'Luxury' },
  { id: 'affordable', name: 'Affordable' },
  { id: 'mixed-use', name: 'Mixed Use' }
];

const MarketSelector: React.FC<MarketSelectorProps> = ({
  selectedMarkets,
  onChange,
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleMarket = (marketId: string) => {
    const updatedMarkets = selectedMarkets.includes(marketId)
      ? selectedMarkets.filter(id => id !== marketId)
      : [...selectedMarkets, marketId];
    
    onChange(updatedMarkets);
  };

  const removeMarket = (e: React.MouseEvent, marketId: string) => {
    e.stopPropagation();
    onChange(selectedMarkets.filter(id => id !== marketId));
  };

  const getSelectedMarketsText = () => {
    if (selectedMarkets.length === 0) {
      return 'Select target markets';
    }
    
    if (selectedMarkets.length === 1) {
      return marketOptions.find(market => market.id === selectedMarkets[0])?.name || 'Select target markets';
    }
    
    return `${selectedMarkets.length} markets selected`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`flex items-center justify-between w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-primary-300 focus:outline-none ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex flex-wrap items-center gap-2">
          {selectedMarkets.length > 0 ? (
            selectedMarkets.map(marketId => {
              const market = marketOptions.find(m => m.id === marketId);
              return market ? (
                <div 
                  key={market.id} 
                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded bg-primary-100 text-primary-700"
                >
                  {market.name}
                  <button
                    onClick={(e) => removeMarket(e, marketId)}
                    className="ml-1 text-primary-500 hover:text-primary-800 focus:outline-none"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null;
            })
          ) : (
            <span className="text-gray-500">Select target markets</span>
          )}
        </div>
        <ChevronDown className={`ml-2 h-5 w-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md overflow-auto">
          <ul className="py-1" role="listbox" aria-labelledby="market-selector">
            {marketOptions.map((market) => {
              const isSelected = selectedMarkets.includes(market.id);
              return (
                <li
                  key={market.id}
                  onClick={() => toggleMarket(market.id)}
                  className={`px-3 py-2 flex items-center justify-between cursor-pointer ${
                    isSelected ? 'bg-primary-50 text-primary-900' : 'hover:bg-gray-100'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span>{market.name}</span>
                  {isSelected && <Check className="h-5 w-5 text-primary-600" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MarketSelector;