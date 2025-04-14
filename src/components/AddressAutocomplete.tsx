import React, { useState, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  error?: string;
}

export default function AddressAutocomplete({ value, onChange, error }: AddressAutocompleteProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.googleMapsLoaded) {
      setIsLoaded(true);
    } else {
      const handleLoad = () => setIsLoaded(true);
      window.addEventListener('google-maps-loaded', handleLoad);
      return () => window.removeEventListener('google-maps-loaded', handleLoad);
    }
  }, []);

  const {
    ready,
    value: inputValue,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'ae' },
      types: ['geocode', 'establishment']
    },
    debounce: 300,
    defaultValue: value,
    initOnMount: isLoaded
  });

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  const handleSelect = async (suggestion: google.maps.places.AutocompletePrediction) => {
    setValue(suggestion.description, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ placeId: suggestion.place_id });
      const { lat, lng } = await getLatLng(results[0]);
      console.log('Selected location coordinates:', { lat, lng });
      onChange(suggestion.description, lat, lng);
    } catch (error) {
      console.error('Error selecting address:', error);
    }
  };

  const handleClear = () => {
    setValue('');
    onChange('');
    clearSuggestions();
  };

  if (!isLoaded) {
    return (
      <div className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50">
        Loading Google Maps...
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInput}
          disabled={!ready}
          placeholder="Enter a location in UAE"
          className={`w-full px-4 py-2.5 pl-10 pr-10 rounded-lg border ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-200 focus:ring-black'
          } bg-gray-50 focus:bg-white focus:ring-2 focus:border-transparent transition-all duration-200`}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        {inputValue && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {status === "OK" && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
          {data.map(suggestion => (
            <button
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
            >
              <MapPin className="h-4 w-4 text-gray-400 mr-2" />
              <span className="truncate">{suggestion.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}