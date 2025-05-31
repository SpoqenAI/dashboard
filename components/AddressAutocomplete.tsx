'use client';

import React, {
  useEffect,
  useState,
  useRef,
  Component,
  ReactNode,
} from 'react';
import {
  GeoapifyGeocoderAutocomplete,
  GeoapifyContext,
} from '@geoapify/react-geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';
import { logger } from '@/lib/logger';

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

class AutocompleteErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error(
      'AddressAutocomplete Error Boundary caught an error:',
      error,
      errorInfo
    );

    let errorMessage = `Geocoding service error: ${error.message}`;

    // Handle specific error types
    if (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('NetworkError')
    ) {
      errorMessage =
        'Network error: Please check your internet connection and try again';
    } else if (
      error.message.includes('timeout') ||
      error.message.includes('Timeout')
    ) {
      errorMessage =
        'Request timeout: The address service is taking too long to respond';
    } else if (
      error.message.includes('API key') ||
      error.message.includes('authentication')
    ) {
      errorMessage =
        'Authentication error: Please check your API key configuration';
    } else if (
      error.message.includes('quota') ||
      error.message.includes('limit')
    ) {
      errorMessage = 'Service limit reached: Please try again later';
    }

    this.props.onError(errorMessage);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full rounded-md border border-red-300 bg-red-50 p-2">
          <p className="text-sm text-red-600">
            <span className="font-medium">Error:</span> The address autocomplete
            service encountered an error. Please try again.
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
  placeholder = 'Enter your business address...',
  value = '',
  className = '',
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!apiKey) {
      console.warn(
        'NEXT_PUBLIC_GEOAPIFY_API_KEY is not set in environment variables'
      );
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

  // Check network connectivity locally
  const checkNetworkConnectivity = (): boolean => {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
      return navigator.onLine;
    }
    return true; // Assume online if we can't check
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
        city:
          value.properties?.city ||
          value.properties?.town ||
          value.properties?.village ||
          '',
        state:
          value.properties?.state ||
          value.properties?.region ||
          value.properties?.county ||
          '',
        postcode: value.properties?.postcode || '',
        country: value.properties?.country || '',
      };

      // Validate that we got at least some address data
      const hasValidData = Object.values(addressData).some(
        val => val && val.trim() !== ''
      );
      if (!hasValidData) {
        handleError('Unable to extract valid address information');
        return;
      }

      // Log the extracted data securely (only in development, with potential PII protection)
      logger.debug('AddressAutocomplete', 'Address data extracted successfully', {
        hasCity: !!addressData.city,
        hasState: !!addressData.state,
        hasPostcode: !!addressData.postcode,
        hasCountry: !!addressData.country,
        // Note: We log presence of data rather than the actual values to protect privacy
      });

      // Call the parent callback if provided
      if (onPlaceSelect) {
        onPlaceSelect(addressData);
      }

      setIsLoading(false);
    } catch (err) {
      let errorMessage =
        'An unexpected error occurred while processing the address';

      if (err instanceof Error) {
        // Handle specific error types
        if (
          err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('NetworkError')
        ) {
          errorMessage =
            'Network error: Please check your internet connection and try again';
        } else if (
          err.message.includes('timeout') ||
          err.message.includes('Timeout')
        ) {
          errorMessage =
            'Request timeout: The address service is taking too long to respond';
        } else if (
          err.message.includes('geoapify') ||
          err.message.includes('geocod')
        ) {
          errorMessage =
            'Geocoding API error: Unable to fetch address suggestions';
        } else {
          errorMessage = err.message;
        }
      }

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

          // Check network connectivity when user starts typing
          if (target.value.length > 2 && !checkNetworkConnectivity()) {
            handleError(
              'No internet connection: Please check your network and try again'
            );
            return;
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

  if (!apiKey) {
    return (
      <div className="w-full rounded-md border border-red-300 bg-red-50 p-2">
        <p className="text-sm text-red-600">
          Geoapify API key is missing. Please set NEXT_PUBLIC_GEOAPIFY_API_KEY
          in your environment variables.
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
              <div className="mt-1 flex items-center text-sm text-blue-600">
                <div className="mr-2 h-3 w-3 animate-spin rounded-full border-b-2 border-blue-600"></div>
                Processing address...
              </div>
            )}

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
        </GeoapifyContext>
      </AutocompleteErrorBoundary>
    </div>
  );
};

export default AddressAutocomplete;
