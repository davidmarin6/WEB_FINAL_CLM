interface PlacePhotoResponse {
  success: boolean;
  photoUrl?: string;
  placeName?: string;
  error?: string;
}

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

// Div oculto singleton para PlacesService
let placesServiceInstance: google.maps.places.PlacesService | null = null;

const getPlacesService = (): google.maps.places.PlacesService | null => {
  if (placesServiceInstance) return placesServiceInstance;

  if (typeof google === 'undefined' || !google.maps?.places) return null;

  const div = document.createElement('div');
  div.style.display = 'none';
  document.body.appendChild(div);
  placesServiceInstance = new google.maps.places.PlacesService(div);
  return placesServiceInstance;
};

/**
 * Espera hasta que Google Maps Places API esté disponible (máx. 5s)
 */
const waitForPlacesService = (): Promise<google.maps.places.PlacesService | null> => {
  return new Promise((resolve) => {
    const service = getPlacesService();
    if (service) { resolve(service); return; }

    const maxAttempts = 10;
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const svc = getPlacesService();
      if (svc) {
        clearInterval(interval);
        resolve(svc);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn('[Places] API not available after 5s');
        resolve(null);
      }
    }, 500);
  });
};

/**
 * Fetches a photo for a Google Maps place using the JS Places API directly
 */
export const fetchPlacePhoto = async (
  mapsUrl: string,
  queryHint?: string
): Promise<PlacePhotoResponse> => {
  try {
    const service = await waitForPlacesService();
    if (!service) {
      console.warn('Google Places API not loaded yet');
      return { success: false, error: 'Google Places API not loaded' };
    }

    const query = queryHint || extractQueryFromUrl(mapsUrl);
    if (!query) {
      console.log('Could not extract place info from URL:', mapsUrl);
      return { success: false, error: 'Could not parse Google Maps URL' };
    }

    return new Promise((resolve) => {
      service.textSearch(
        { query: query + ' Castilla-La Mancha España' },
        (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results &&
            results.length > 0
          ) {
            console.log("[PhotoFetch] API Success for:", query, results[0]);

            // Función para normalizar texto (quitar acentos, puntuación, pasar a minúsculas)
            const normalizeStr = (str: string) =>
              str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, "");

            // Extraer palabras clave de la query original ignorando "stopwords" comunes
            const queryWords = normalizeStr(query)
              .split(/\s+/)
              .filter(w => w.length > 3 && !['para', 'como', 'españa', 'castilla', 'mancha', 'toledo', 'ciudad', 'real', 'cuenca', 'albacete', 'guadalajara'].includes(w));

            // Filtrar resultados hiper-genéricos (e.g. Si buscamos un restaurante y nos devuelve "Castilla-La Mancha")
            const isGenericRegion = (name: string) => {
              const lowerName = name.toLowerCase();
              return lowerName.includes('castilla-la mancha') ||
                lowerName.includes('castile-la mancha') ||
                lowerName === 'toledo' ||
                lowerName === 'españa' ||
                lowerName === 'spain';
            };

            // Intentar encontrar el primer resultado que NO sea una región genérica,
            // que tenga fotos, y que su nombre comparta alguna palabra clave relevante con la búsqueda.
            let validPlace = results.find(p => {
              if (!p.name || isGenericRegion(p.name) || !p.photos || p.photos.length === 0) return false;

              // Si no hay palabras clave largas en la query, aceptamos el primer resultado válido
              if (queryWords.length === 0) return true;

              // Verificar que al menos una palabra clave de la búsqueda original esté en el nombre devuelto por Google
              const resultNameWords = normalizeStr(p.name).split(/\s+/);
              const hasMatch = queryWords.some(qw => resultNameWords.some(rnw => rnw.includes(qw) || qw.includes(rnw)));

              if (!hasMatch) {
                console.log(`[PhotoFetch] Rejecting "${p.name}" as it doesn't match query keywords: [${queryWords.join(',')}]`);
              }

              return hasMatch;
            });

            // Si todo lo que devolvió era genérico, o no hay fotos para el lugar específico,
            // usamos undefined para forzar el fallback (mapa de pin)
            if (!validPlace) {
              console.log(`[PhotoFetch] Result for "${query}" was too generic, lacked photos, or was completely irrelevant. Discarding.`);
              resolve({
                success: false,
                error: 'Result was too generic, had no photos, or was irrelevant',
              });
              return;
            }

            const hasPhotos = validPlace.photos && validPlace.photos.length > 0;
            console.log(`[PhotoFetch] Result for "${query}": Photos found? ${hasPhotos} (${validPlace.photos?.length || 0})`);

            const photo = validPlace.photos?.[0];
            const photoUrl = photo
              ? photo.getUrl({ maxWidth: 600, maxHeight: 300 })
              : undefined;

            resolve({
              success: !!photoUrl,
              photoUrl,
              placeName: validPlace.name || query,
            });
          } else {
            resolve({
              success: false,
              error: `Places API returned status: ${status}`,
            });
          }
        }
      );
    });
  } catch (error) {
    console.error('Error fetching place photo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
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
