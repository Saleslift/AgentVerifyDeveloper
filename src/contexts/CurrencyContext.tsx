import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'AED' | 'USD' | 'EUR';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatPrice: (price: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const conversionRates: Record<Currency, number> = {
  'AED': 1,
  'USD': 0.27,
  'EUR': 0.25
};

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('preferred-currency');
    return (saved as Currency) || 'AED';
  });

  useEffect(() => {
    localStorage.setItem('preferred-currency', currency);
  }, [currency]);

  const formatPrice = (price: number): string => {
    const convertedPrice = price * conversionRates[currency];
    return `${currency} ${convertedPrice.toLocaleString(undefined, {
      maximumFractionDigits: 0
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}