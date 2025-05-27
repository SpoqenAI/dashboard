'use client';

import React, { useEffect } from 'react';
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
  placeholder?: string;
  value?: string;
  className?: string;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  onPlaceSelect,
  onInputChange,
  placeholder = "Enter your business address...",
  value = "",
  className = ""
}) => {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      console.warn('NEXT_PUBLIC_GEOAPIFY_API_KEY is not set in environment variables');
    }
  }, [apiKey]);

  const handlePlaceSelect = (value: any) => {
    if (!value) return;

    // Extract address components from the Geoapify response
    const addressData: AddressData = {
      city: value.properties?.city || value.properties?.town || value.properties?.village || '',
      state: value.properties?.state || value.properties?.region || value.properties?.county || '',
      postcode: value.properties?.postcode || '',
      country: value.properties?.country || ''
    };

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
  };

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
    <GeoapifyContext apiKey={apiKey}>
      <div className={`address-autocomplete-wrapper ${className}`}>
        <GeoapifyGeocoderAutocomplete
          placeholder={placeholder}
          value={value}
          placeSelect={handlePlaceSelect}
        />
      </div>
    </GeoapifyContext>
  );
};

export default AddressAutocomplete; 