const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { placeId, query } = await req.json();

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let photoReference: string | null = null;
    let placeName: string | null = null;

    // If we have a placeId, use Place Details API
    if (placeId) {
      console.log('Fetching place details for:', placeId);
      
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos&key=${apiKey}`;
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.status === 'OK' && detailsData.result?.photos?.length > 0) {
        photoReference = detailsData.result.photos[0].photo_reference;
        placeName = detailsData.result.name;
      }
    }
    // If we have a query (search term), use Text Search API
    else if (query) {
      console.log('Searching for place:', query);
      
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
      const searchResponse = await fetch(searchUrl);
      const searchData = await searchResponse.json();

      if (searchData.status === 'OK' && searchData.results?.length > 0) {
        const place = searchData.results[0];
        if (place.photos?.length > 0) {
          photoReference = place.photos[0].photo_reference;
          placeName = place.name;
        }
      }
    }

    if (!photoReference) {
      return new Response(
        JSON.stringify({ success: false, error: 'No photo found for this place' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the photo URL (we return the URL for the client to use directly)
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photoReference}&key=${apiKey}`;

    // Fetch the actual photo to get the redirected URL
    const photoResponse = await fetch(photoUrl, { redirect: 'follow' });
    const finalUrl = photoResponse.url;

    console.log('Photo found for:', placeName);

    return new Response(
      JSON.stringify({ 
        success: true, 
        photoUrl: finalUrl,
        placeName 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching place photo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch place photo';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
