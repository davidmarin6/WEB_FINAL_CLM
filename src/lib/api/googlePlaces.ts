import { supabase } from '@/integrations/supabase/client';

interface PlacePhotoResponse {
  success: boolean;
  photoUrl?: string;
  placeName?: string;
  error?: string;
}

/**
 * Extracts place ID from a Google Maps URL
 */
export const extractPlaceIdFromUrl = (url: string): string | null => {
  // Pattern for place_id in URL
  const placeIdMatch = url.match(/place_id[=:]([^&/]+)/i);
  if (placeIdMatch) return placeIdMatch[1];

  // Pattern for /place/ URLs with CID in data parameter
  const cidMatch = url.match(/\/place\/[^/]+\/(@[^/]+\/)?data=.*!1s(0x[a-f0-9]+:[a-f0-9]+)/i);
  if (cidMatch) return cidMatch[2];

  return null;
};

/**
 * Extracts CID (Customer ID) from a Google Maps URL
 */
export const extractCidFromUrl = (url: string): string | null => {
  // Pattern for cid= parameter (e.g., ?cid=7619784663532497854)
  const cidMatch = url.match(/[?&]cid=(\d+)/);
  if (cidMatch) return cidMatch[1];

  return null;
};

/**
 * Extracts search query from a Google Maps URL
 */
export const extractQueryFromUrl = (url: string): string | null => {
  // Pattern for /place/NAME/ URLs
  const placeMatch = url.match(/\/place\/([^/@]+)/);
  if (placeMatch) {
    return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
  }

  // Pattern for /search/ URLs
  const searchMatch = url.match(/\/search\/([^/@]+)/);
  if (searchMatch) {
    return decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
  }

  // Pattern for q= parameter
  const queryMatch = url.match(/[?&]q=([^&]+)/);
  if (queryMatch) {
    return decodeURIComponent(queryMatch[1].replace(/\+/g, ' '));
  }

  return null;
};

/**
 * Fetches a photo for a Google Maps place
 */
export const fetchPlacePhoto = async (
  mapsUrl: string,
  queryHint?: string
): Promise<PlacePhotoResponse> => {
  try {
    const placeId = extractPlaceIdFromUrl(mapsUrl);
    const cid = extractCidFromUrl(mapsUrl);
    const query = extractQueryFromUrl(mapsUrl);

    if (!placeId && !cid && !query) {
      console.log('Could not extract place info from URL:', mapsUrl);
      return { success: false, error: 'Could not parse Google Maps URL' };
    }

    // Use backend parsing to support more Google Maps URL variants (incl. cid=...)
    // and to avoid 404 responses that surface as runtime errors in the client.
    const { data, error } = await supabase.functions.invoke('google-maps-photo', {
      body: { mapsUrl, queryHint },
    });

    if (error) {
      console.error('Error calling google-maps-photo:', error);
      return { success: false, error: error.message };
    }

    return data as PlacePhotoResponse;
  } catch (error) {
    console.error('Error fetching place photo:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

/**
 * Checks if a URL is a Google Maps URL
 */
export const isGoogleMapsUrl = (url: string): boolean => {
  return /google\.(com|[a-z]{2})\/maps/i.test(url) || 
         /maps\.google\.(com|[a-z]{2})/i.test(url) ||
         /goo\.gl\/maps/i.test(url);
};
