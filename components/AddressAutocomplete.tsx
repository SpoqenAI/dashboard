'use client';

import React, { useEffect, useState, useRef, Component, ReactNode } from 'react';
import { GeoapifyGeocoderAutocomplete, GeoapifyContext } from '@geoapify/react-geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';

interface AddressData {
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

interface AddressAutocompleteProps {
  onPlaceSelect?: (addressData: AddressData) => void;
  onInputChange?: (value: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  value?: string;
  className?: string;
}

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  onError: (error: string) => void;
}

class AutocompleteErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('AddressAutocomplete Error Boundary caught an error:', error, errorInfo);
    this.props.onError(`Geocoding service error: ${error.message}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-2 border border-red-300 rounded-md bg-red-50">
          <p className="text-red-600 text-sm">
            <span className="font-medium">Error:</span> The address autocomplete service encountered an error. Please try again.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onPlaceSelect,
  onInputChange,
  onError,
  placeholder = "Enter your business address...",
  value = "",
  className = ""
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apiKey) {
      console.warn('NEXT_PUBLIC_GEOAPIFY_API_KEY is not set in environment variables');
    }
  }, [apiKey]);

  const clearError = () => {
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    console.error('AddressAutocomplete error:', errorMessage);
    setError(errorMessage);
    setIsLoading(false);
    
    // Call parent error handler if provided
    if (onError) {
      onError(errorMessage);
    }
  };

  const handlePlaceSelect = (value: any) => {
    try {
      setIsLoading(true);
      clearError();

      if (!value) {
        handleError('No address data received');
        return;
      }

      // Validate that we have the expected structure
      if (!value.properties) {
        handleError('Invalid address data format received');
        return;
      }

      // Extract address components from the Geoapify response
      const addressData: AddressData = {
        city: value.properties?.city || value.properties?.town || value.properties?.village || '',
        state: value.properties?.state || value.properties?.region || value.properties?.county || '',
        postcode: value.properties?.postcode || '',
        country: value.properties?.country || ''
      };

      // Validate that we got at least some address data
      const hasValidData = Object.values(addressData).some(val => val && val.trim() !== '');
      if (!hasValidData) {
        handleError('Unable to extract valid address information');
        return;
      }

      // Console.log the extracted data as requested
      console.log('Selected address data:', {
        city: addressData.city,
        state: addressData.state,
        postcode: addressData.postcode,
        country: addressData.country
      });

      // Call the parent callback if provided
      if (onPlaceSelect) {
        onPlaceSelect(addressData);
      }

      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while processing the address';
      handleError(errorMessage);
    }
  };

  // Monitor input changes through DOM events
  useEffect(() => {
    if (wrapperRef.current) {
      const inputElement = wrapperRef.current.querySelector('input');
      
      if (inputElement) {
        const handleInputChange = (event: Event) => {
          const target = event.target as HTMLInputElement;
          
          // Clear any previous errors when user starts typing
          if (error) {
            clearError();
          }
          
          if (onInputChange) {
            onInputChange(target.value);
          }
        };

        const handleFocus = () => {
          setIsLoading(true);
        };

        const handleBlur = () => {
          setIsLoading(false);
        };

        // Add event listeners
        inputElement.addEventListener('input', handleInputChange);
        inputElement.addEventListener('focus', handleFocus);
        inputElement.addEventListener('blur', handleBlur);

        // Cleanup
        return () => {
          inputElement.removeEventListener('input', handleInputChange);
          inputElement.removeEventListener('focus', handleFocus);
          inputElement.removeEventListener('blur', handleBlur);
        };
      }
    }
  }, [error, onInputChange]);

  // Monitor for network errors or API failures
  useEffect(() => {
    const handleNetworkError = () => {
      handleError('Network error: Please check your internet connection and try again');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.toString().includes('geoapify')) {
        handleError('Geocoding API error: Unable to fetch address suggestions');
        event.preventDefault();
      }
    };

    window.addEventListener('offline', handleNetworkError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('offline', handleNetworkError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (!apiKey) {
    return (
      <div className="w-full p-2 border border-red-300 rounded-md bg-red-50">
        <p className="text-red-600 text-sm">
          Geoapify API key is missing. Please set NEXT_PUBLIC_GEOAPIFY_API_KEY in your environment variables.
        </p>
      </div>
    );
  }

  return (
    <div className={`address-autocomplete-container ${className}`}>
      <AutocompleteErrorBoundary onError={handleError}>
        <GeoapifyContext apiKey={apiKey}>
          <div className="address-autocomplete-wrapper" ref={wrapperRef}>
            <GeoapifyGeocoderAutocomplete
              placeholder={placeholder}
              value={value}
              placeSelect={handlePlaceSelect}
            />
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="mt-1 text-sm text-blue-600 flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                Processing address...
              </div>
            )}
            
            {/* Error display */}
            {error && (
              <div className="mt-1 p-2 border border-red-300 rounded-md bg-red-50">
                <div className="flex items-center justify-between">
                  <p className="text-red-600 text-sm flex-1">
                    <span className="font-medium">Error:</span> {error}
                  </p>
                  <button
                    onClick={clearError}
                    className="ml-2 text-red-600 hover:text-red-800 text-sm underline"
                    type="button"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        </GeoapifyContext>
      </AutocompleteErrorBoundary>
    </div>
  );
};

export default AddressAutocomplete; 