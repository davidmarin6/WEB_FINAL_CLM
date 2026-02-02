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

const extractPlaceName = (html: string): string | null => {
  // Try og:description first - often contains the real place name
  const ogDesc = html.match(
    /<meta\s+(?:property|name)=["']og:description["']\s+content=["']([^"']+)["']/i
  );
  if (ogDesc?.[1]) {
    const desc = ogDesc[1].trim();
    // og:description often starts with the place name
    if (desc && !desc.toLowerCase().includes("google maps")) {
      // Take first sentence or phrase before common separators
      const namePart = desc.split(/[·\-–—|,]/)[0].trim();
      if (namePart && namePart.length > 3 && namePart.length < 100) {
        return namePart;
      }
    }
  }

  // Try og:title but filter out generic "Google Maps" titles
  const ogTitle = html.match(
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
  );
  if (ogTitle?.[1]) {
    const title = ogTitle[1].trim();
    // Skip if it's just "Google Maps" or similar generic title
    if (title && !title.toLowerCase().match(/^google\s*(maps)?$/i)) {
      const cleaned = title.replace(/\s*-\s*Google\s*Maps\s*$/i, "").trim();
      if (cleaned && cleaned.length > 2) {
        return cleaned;
      }
    }
  }

  // Fallback to <title> tag
  const title = html.match(/<title>([^<]+)<\/title>/i);
  if (title?.[1]) {
    const cleaned = title[1].replace(/\s*-\s*Google\s*Maps\s*$/i, "").trim();
    if (cleaned && !cleaned.toLowerCase().match(/^google\s*(maps)?$/i) && cleaned.length > 2) {
      return cleaned;
    }
  }

  return null;
};

const extractPlaceIdFromHtml = (html: string): string | null => {
  // Common JSON pattern inside the Maps HTML
  const m1 = html.match(/"place_id"\s*:\s*"(ChI[^"\\]+)"/);
  if (m1?.[1]) return m1[1];

  // Some pages include place id as an attribute
  const m2 = html.match(/data-place-id=["'](ChI[^"']+)["']/);
  if (m2?.[1]) return m2[1];

  // Last resort: find any token that looks like a Place ID
  const m3 = html.match(/\bChI[a-zA-Z0-9_-]{20,}\b/);
  if (m3?.[0]) return m3[0];

  return null;
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

const fetchFindPlaceByCid = async (apiKey: string, cid: string) => {
  const input = `cid:${cid}`;
  const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(
    input
  )}&inputtype=textquery&fields=place_id,name,photos&key=${apiKey}`;

  const findRes = await fetch(findUrl);
  const findData = await findRes.json();

  if (findData.status && findData.status !== "OK") {
    if (findData.status === "ZERO_RESULTS") return null;
    const err = findData.error_message
      ? `${findData.status}: ${findData.error_message}`
      : `${findData.status}`;
    throw new Error(`Google Places FindPlace error (${err})`);
  }

  if (!findData.candidates?.length) return null;

  const first = findData.candidates[0];
  const placeName = (first.name as string | undefined) ?? null;

  if (first.photos?.length > 0) {
    return {
      placeName,
      photoReference: first.photos[0].photo_reference as string,
    };
  }

  // If no photos returned, try details with place_id
  if (first.place_id) {
    return await fetchPlaceDetailsPhoto(apiKey, first.place_id as string);
  }

  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mapsUrl, queryHint } = (await req.json()) as {
      mapsUrl?: string;
      queryHint?: string;
    };

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

    if (!result && queryHint && typeof queryHint === "string" && queryHint.trim()) {
      const hint = queryHint.trim();
      console.log("Searching place by query hint:", hint);
      result = await fetchTextSearchPhoto(apiKey, hint);
    }

    if (!result && cid) {
      console.log("Resolving place from CID via Maps HTML:", cid);

      const mapsPageUrl = `https://www.google.com/maps?cid=${encodeURIComponent(cid)}`;
      const pageRes = await fetch(mapsPageUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
      });
      const html = await pageRes.text();

      const placeIdFromHtml = extractPlaceIdFromHtml(html);
      if (placeIdFromHtml) {
        console.log("CID HTML resolved to placeId:", placeIdFromHtml);
        result = await fetchPlaceDetailsPhoto(apiKey, placeIdFromHtml);
      }

      if (!result) {
        const name = extractPlaceName(html);
        if (name) {
          console.log("CID scraped name:", name);
          result = await fetchTextSearchPhoto(apiKey, name);
        } else {
          console.log("Could not resolve name from CID HTML");
        }
      }

      // Last resort: FindPlace (can be inaccurate, so only if HTML parsing fails)
      if (!result) {
        console.log("CID HTML lookup failed; trying FindPlace fallback:", cid);
        result = await fetchFindPlaceByCid(apiKey, cid);
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
