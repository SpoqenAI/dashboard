'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface AddressData {
  // Basic address components
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  // Formatted address string
  formatted_address?: string;

  // Additional metadata
  address_type?: 'business' | 'home' | 'other';

  // Raw Geoapify data for reference
  geoapify_data?: any;
  geoapify_place_id?: string;
}

interface AddressAutocompleteProps {
  onPlaceSelect?: (addressData: AddressData) => void;
  onInputChange?: (value: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  value?: string;
  className?: string;
}

interface GeoapifyFeature {
  properties: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    region?: string;
    county?: string;
    postcode?: string;
    country?: string;
    formatted?: string;
    housenumber?: string;
    street?: string;
    name?: string;
    place_id?: string;
    lat?: number;
    lon?: number;
    [key: string]: any; // Allow additional properties from Geoapify
  };
  geometry: {
    coordinates: [number, number];
  };
}

interface GeoapifyResponse {
  features: GeoapifyFeature[];
}

const AddressAutocompleteServerSide: React.FC<AddressAutocompleteProps> = ({
  onPlaceSelect,
  onInputChange,
  onError,
  placeholder = 'Enter your business address...',
  value = '',
  className = '',
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<GeoapifyFeature[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const clearError = () => {
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('AddressAutocomplete error:', errorMessage);
    }
    setError(errorMessage);
    setIsLoading(false);
    setSuggestions([]);
    setShowSuggestions(false);

    // Call parent error handler if provided
    if (onError) {
      onError(errorMessage);
    }
  };

  // Debounced search function
  const searchAddresses = useCallback(async (searchText: string) => {
    if (!searchText || searchText.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      clearError();

      const response = await fetch(
        `/api/geocode?text=${encodeURIComponent(searchText.trim())}&limit=5`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data: GeoapifyResponse = await response.json();

      if (!data || !Array.isArray(data.features)) {
        throw new Error('Invalid response format from server');
      }

      setSuggestions(data.features);
      setShowSuggestions(data.features.length > 0);
      setSelectedIndex(-1);

      logger.debug('AddressAutocomplete', 'Search completed successfully', {
        resultCount: data.features.length,
        searchLength: searchText.length,
      });
    } catch (error) {
      // Ignore aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }

      let errorMessage = 'Failed to fetch address suggestions';

      if (error instanceof Error) {
        if (
          error.message.includes('fetch') ||
          error.message.includes('network')
        ) {
          errorMessage = 'Network error: Please check your internet connection';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout: Please try again';
        } else if (error.message.includes('Rate limit')) {
          errorMessage =
            'Too many requests: Please wait a moment and try again';
        } else {
          errorMessage = error.message;
        }
      }

      handleError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search requests
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue.trim().length >= 2) {
        searchAddresses(inputValue);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [inputValue, searchAddresses]);

  const extractAddressData = (feature: GeoapifyFeature): AddressData => {
    const props = feature.properties;

    return {
      street_address:
        props.housenumber && props.street
          ? `${props.housenumber} ${props.street}`
          : props.street || props.name || '',
      city: props.city || props.town || props.village || '',
      state: props.state || props.region || props.county || '',
      postal_code: props.postcode || '',
      country: props.country || '',
      formatted_address: props.formatted || '',
      address_type: 'business', // Default to business for user profiles
      geoapify_data: props,
      geoapify_place_id: props.place_id,
    };
  };

  const handlePlaceSelect = (feature: GeoapifyFeature) => {
    try {
      clearError();

      const addressData = extractAddressData(feature);
      const formattedAddress = feature.properties.formatted || inputValue;

      // Validate that we got some address data
      const hasValidData = Object.values(addressData).some(
        val => val && val.trim() !== ''
      );

      if (!hasValidData) {
        handleError('Unable to extract valid address information');
        return;
      }

      setInputValue(formattedAddress);
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);

      // Call parent callback
      if (onPlaceSelect) {
        onPlaceSelect(addressData);
      }

      logger.debug('AddressAutocomplete', 'Address selected successfully', {
        hasStreetAddress: !!addressData.street_address,
        hasCity: !!addressData.city,
        hasState: !!addressData.state,
        hasPostcode: !!addressData.postal_code,
        hasCountry: !!addressData.country,
        hasFormattedAddress: !!addressData.formatted_address,
      });
    } catch (err) {
      handleError('Error processing selected address');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (error) {
      clearError();
    }

    if (onInputChange) {
      onInputChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handlePlaceSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay hiding suggestions to allow clicking on them
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    }, 200);
  };

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className={`address-autocomplete-container relative ${className}`}>
      <div className="address-autocomplete-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoComplete="off"
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg"
          >
            {suggestions.map((feature, index) => (
              <div
                key={index}
                className={`cursor-pointer px-3 py-2 text-sm hover:bg-gray-100 ${
                  index === selectedIndex ? 'bg-blue-50' : ''
                }`}
                onClick={() => handlePlaceSelect(feature)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="font-medium">
                  {feature.properties.formatted ||
                    `${feature.properties.city || feature.properties.town || ''}, ${feature.properties.state || ''} ${feature.properties.postcode || ''}`}
                </div>
                {feature.properties.country && (
                  <div className="text-xs text-gray-500">
                    {feature.properties.country}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-1 rounded-md border border-red-300 bg-red-50 p-2">
          <div className="flex items-center justify-between">
            <p className="flex-1 text-sm text-red-600">
              <span className="font-medium">Error:</span> {error}
            </p>
            <button
              onClick={clearError}
              className="ml-2 text-sm text-red-600 underline hover:text-red-800"
              type="button"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteServerSide;
