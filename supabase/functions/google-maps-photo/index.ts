const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type GoogleMapsPhotoResponse =
  | {
      success: true;
      photoUrl: string;
      placeName?: string | null;
    }
  | {
      success: false;
      error: string;
    };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const extractOgTitle = (html: string): string | null => {
  // Most reliable on maps pages
  const og = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']\s*\/?\s*>/i
  );
  if (og?.[1]) return og[1].trim();

  // Fallback to <title>
  const title = html.match(/<title>([^<]+)<\/title>/i);
  if (!title?.[1]) return null;
  return title[1].replace(/\s*-\s*Google\s*Maps\s*$/i, "").trim();
};

const getPlaceIdFromMapsUrl = (mapsUrl: string): string | null => {
  // place_id=...
  const placeIdMatch = mapsUrl.match(/place_id[=:]([^&/]+)/i);
  if (placeIdMatch?.[1]) return placeIdMatch[1];
  return null;
};

const getCidFromMapsUrl = (mapsUrl: string): string | null => {
  try {
    const u = new URL(mapsUrl);
    const cid = u.searchParams.get("cid");
    return cid && /^\d+$/.test(cid) ? cid : null;
  } catch {
    const cidMatch = mapsUrl.match(/[?&]cid=(\d+)/);
    return cidMatch?.[1] ?? null;
  }
};

const getQueryFromMapsUrl = (mapsUrl: string): string | null => {
  try {
    const u = new URL(mapsUrl);
    const q = u.searchParams.get("q");
    return q ? q.trim() : null;
  } catch {
    const qMatch = mapsUrl.match(/[?&]q=([^&]+)/);
    return qMatch?.[1] ? decodeURIComponent(qMatch[1].replace(/\+/g, " ")) : null;
  }
};

const fetchPlaceDetailsPhoto = async (apiKey: string, placeId: string) => {
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
    placeId
  )}&fields=name,photos&key=${apiKey}`;
  const detailsResponse = await fetch(detailsUrl);
  const detailsData = await detailsResponse.json();

  if (detailsData.status && detailsData.status !== "OK") {
    const err = detailsData.error_message
      ? `${detailsData.status}: ${detailsData.error_message}`
      : `${detailsData.status}`;
    throw new Error(`Google Places Details error (${err})`);
  }

  if (detailsData.status === "OK" && detailsData.result?.photos?.length > 0) {
    return {
      placeName: detailsData.result.name as string | null,
      photoReference: detailsData.result.photos[0].photo_reference as string,
    };
  }

  return null;
};

const fetchTextSearchPhoto = async (apiKey: string, query: string) => {
  const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
    query
  )}&key=${apiKey}`;
  const searchResponse = await fetch(searchUrl);
  const searchData = await searchResponse.json();

  if (searchData.status && searchData.status !== "OK") {
    const err = searchData.error_message
      ? `${searchData.status}: ${searchData.error_message}`
      : `${searchData.status}`;
    throw new Error(`Google Places TextSearch error (${err})`);
  }

  if (!searchData.results?.length) return null;

  const first = searchData.results[0];
  const placeName = (first.name as string | undefined) ?? null;

  if (first.photos?.length > 0) {
    return {
      placeName,
      photoReference: first.photos[0].photo_reference as string,
    };
  }

  // If no photos in search result, try details using place_id
  if (first.place_id) {
    return await fetchPlaceDetailsPhoto(apiKey, first.place_id as string);
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mapsUrl } = (await req.json()) as { mapsUrl?: string };

    if (!mapsUrl || typeof mapsUrl !== "string") {
      return json(200, { success: false, error: "Missing mapsUrl" } satisfies GoogleMapsPhotoResponse);
    }

    const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) {
      return json(200, {
        success: false,
        error: "Google Places API key not configured",
      } satisfies GoogleMapsPhotoResponse);
    }

    const placeId = getPlaceIdFromMapsUrl(mapsUrl);
    const cid = getCidFromMapsUrl(mapsUrl);
    const queryFromUrl = getQueryFromMapsUrl(mapsUrl);

    let result:
      | {
          placeName: string | null;
          photoReference: string;
        }
      | null = null;

    if (placeId) {
      console.log("Fetching place details for placeId:", placeId);
      result = await fetchPlaceDetailsPhoto(apiKey, placeId);
    }

    if (!result) {
      const query = queryFromUrl;
      if (query) {
        console.log("Searching place by query param:", query);
        result = await fetchTextSearchPhoto(apiKey, query);
      }
    }

    if (!result && cid) {
      console.log("Resolving place name from CID:", cid);

      const mapsPageUrl = `https://www.google.com/maps?cid=${encodeURIComponent(cid)}`;
      const pageRes = await fetch(mapsPageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
      });
      const html = await pageRes.text();

      const name = extractOgTitle(html);
      if (name) {
        console.log("CID resolved to name:", name);
        result = await fetchTextSearchPhoto(apiKey, name);
      } else {
        console.log("Could not resolve name from CID HTML");
      }
    }

    if (!result) {
      // Always return 200 so the client doesn't throw for a 404.
      return json(200, {
        success: false,
        error: "No photo found for this place",
      } satisfies GoogleMapsPhotoResponse);
    }

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${encodeURIComponent(
      result.photoReference
    )}&key=${apiKey}`;

    const photoResponse = await fetch(photoUrl, { redirect: "follow" });
    await photoResponse.arrayBuffer(); // consume body

    return json(200, {
      success: true,
      photoUrl: photoResponse.url,
      placeName: result.placeName,
    } satisfies GoogleMapsPhotoResponse);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch place photo";
    console.error("google-maps-photo error:", error);
    return json(200, { success: false, error: msg } satisfies GoogleMapsPhotoResponse);
  }
});
