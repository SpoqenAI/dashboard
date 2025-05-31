import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const limit = searchParams.get('limit') || '5';

    // Validate input
    if (!text || text.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search text must be at least 2 characters long' },
        { status: 400 }
      );
    }

    // Get API key from server-side environment
    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      logger.error('Geocode API', 'Geoapify API key not configured');
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      );
    }

    // Construct Geoapify API URL
    const geoapifyUrl = new URL('https://api.geoapify.com/v1/geocode/search');
    geoapifyUrl.searchParams.set('text', text.trim());
    geoapifyUrl.searchParams.set('limit', limit);
    geoapifyUrl.searchParams.set('apiKey', apiKey);

    // Optional: Add additional filters for better results
    // geoapifyUrl.searchParams.set('type', 'amenity,building,street,locality');
    // geoapifyUrl.searchParams.set('format', 'geojson');

    logger.debug('Geocode API', 'Making request to Geoapify', {
      searchLength: text.length,
      limit: parseInt(limit),
    });

    // Make request to Geoapify
    const response = await fetch(geoapifyUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      logger.error('Geocode API', 'Geoapify API error', undefined, {
        status: response.status,
        statusText: response.statusText,
      });

      // Handle specific error cases
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed with geocoding service' },
          { status: 500 }
        );
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      } else if (response.status >= 500) {
        return NextResponse.json(
          { error: 'Geocoding service temporarily unavailable' },
          { status: 503 }
        );
      } else {
        return NextResponse.json(
          { error: 'Failed to fetch address suggestions' },
          { status: 500 }
        );
      }
    }

    const data = await response.json();

    // Validate response structure
    if (!data || !data.features) {
      logger.warn('Geocode API', 'Invalid response structure from Geoapify');
      return NextResponse.json(
        { error: 'Invalid response from geocoding service' },
        { status: 500 }
      );
    }

    logger.debug('Geocode API', 'Successfully fetched geocoding results', {
      resultCount: data.features?.length || 0,
    });

    // Return the results (same format as Geoapify)
    return NextResponse.json(data);
  } catch (error) {
    logger.error(
      'Geocode API',
      'Unexpected error',
      error instanceof Error ? error : undefined,
      {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'UnknownError',
      }
    );

    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 408 }
        );
      } else if (error.message.includes('fetch')) {
        return NextResponse.json(
          { error: 'Network error. Please check your connection.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add autocomplete endpoint for different use cases
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, filters = {} } = body;

    if (!text || text.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search text must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Geocoding service not configured' },
        { status: 500 }
      );
    }

    // Use autocomplete endpoint for better suggestions
    const geoapifyUrl = new URL(
      'https://api.geoapify.com/v1/geocode/autocomplete'
    );
    geoapifyUrl.searchParams.set('text', text.trim());
    geoapifyUrl.searchParams.set('apiKey', apiKey);

    // Apply filters if provided
    if (filters.limit)
      geoapifyUrl.searchParams.set('limit', String(filters.limit));
    if (filters.type) geoapifyUrl.searchParams.set('type', filters.type);
    if (filters.countrycode)
      geoapifyUrl.searchParams.set(
        'filter',
        `countrycode:${filters.countrycode}`
      );

    const response = await fetch(geoapifyUrl.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'spoqen-dashboard/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.error(
        'Geocode Autocomplete API',
        'Geoapify API error',
        undefined,
        {
          status: response.status,
        }
      );
      return NextResponse.json(
        { error: 'Failed to fetch address suggestions' },
        { status: response.status >= 500 ? 503 : 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logger.error(
      'Geocode Autocomplete API',
      'Unexpected error',
      error instanceof Error ? error : undefined,
      {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : 'UnknownError',
      }
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
