import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Location {
  id: string;
  nombre: string;
  direccion: string;
  lat?: number;
  lng?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalSupabaseUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const externalSupabaseKey = Deno.env.get("EXTERNAL_SUPABASE_ANON_KEY");
    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    if (!externalSupabaseUrl || !externalSupabaseKey) {
      throw new Error("External Supabase credentials not configured");
    }

    const supabase = createClient(externalSupabaseUrl, externalSupabaseKey);

    const { data: lugares, error } = await supabase
      .from("lugares")
      .select("id, nombre, direccion");

    if (error) {
      throw error;
    }

    // Geocode addresses to get coordinates
    const locationsWithCoords: Location[] = [];

    for (const lugar of lugares || []) {
      let lat: number | undefined;
      let lng: number | undefined;

      if (googleApiKey && lugar.direccion) {
        try {
          const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            lugar.direccion
          )}&key=${googleApiKey}`;
          
          const geocodeResponse = await fetch(geocodeUrl);
          const geocodeData = await geocodeResponse.json();

          if (geocodeData.status === "OK" && geocodeData.results?.[0]) {
            lat = geocodeData.results[0].geometry.location.lat;
            lng = geocodeData.results[0].geometry.location.lng;
          }
        } catch (geocodeError) {
          console.error(`Failed to geocode ${lugar.direccion}:`, geocodeError);
        }
      }

      locationsWithCoords.push({
        id: lugar.id,
        nombre: lugar.nombre,
        direccion: lugar.direccion,
        lat,
        lng,
      });
    }

    return new Response(JSON.stringify({ locations: locationsWithCoords }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching locations:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
