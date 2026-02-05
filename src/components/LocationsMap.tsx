import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Loader2, ExternalLink } from "lucide-react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { createClient } from "@supabase/supabase-js";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";

// External Supabase client for locations data
const externalSupabase = createClient(
  "https://gxxawcabaumewbprimrw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eGF3Y2FiYXVtZXdicHJpbXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYyMTcyMCwiZXhwIjoyMDg1MTk3NzIwfQ.VQcEsggIIoLDHf7DlDEF_p9987Q_96p8uM8G2IE36AQ"
);

interface Location {
  id: string;
  nombre: string;
  direccion: string;
  lat?: number;
  lng?: number;
}

interface LocationsMapProps {
  isOpen: boolean;
  onClose: () => void;
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "300px",
};

const defaultCenter = {
  lat: 39.4,
  lng: -3.0,
};

export const LocationsMap = ({ isOpen, onClose }: LocationsMapProps) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Query lugares directly from external Supabase
      const { data: lugares, error: fetchError } = await externalSupabase
        .from("lugares")
        .select("id, nombre, direccion, latitud, longitud");

      if (fetchError) {
        throw fetchError;
      }

      // Map the data to our Location interface
      const locationsData: Location[] = (lugares || []).map((lugar: { id: string; nombre: string; direccion: string; latitud?: number; longitud?: number }) => ({
        id: lugar.id,
        nombre: lugar.nombre,
        direccion: lugar.direccion,
        lat: lugar.latitud,
        lng: lugar.longitud,
      }));

      setLocations(locationsData);
    } catch (err) {
      console.error("Error fetching locations:", err);
      setError("No se pudieron cargar las ubicaciones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
    }
  }, [isOpen, fetchLocations]);

  const validLocations = locations.filter((loc) => loc.lat && loc.lng);

  const getCenter = (): { lat: number; lng: number } => {
    if (validLocations.length > 0) {
      const avgLat =
        validLocations.reduce((sum, loc) => sum + (loc.lat || 0), 0) /
        validLocations.length;
      const avgLng =
        validLocations.reduce((sum, loc) => sum + (loc.lng || 0), 0) /
        validLocations.length;
      return { lat: avgLat, lng: avgLng };
    }
    return defaultCenter;
  };

  const openInGoogleMaps = (location: Location) => {
    const url =
      location.lat && location.lng
        ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          location.direccion
        )}`;

    const topWindow = window.top || window.parent || window;
    topWindow.open(url, "_blank", "noopener,noreferrer");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <motion.header
            className="flex items-center justify-between px-4 md:px-8 py-4 bg-gradient-to-r from-primary to-accent border-b border-border"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-primary-foreground" />
              <div>
                <h1 className="text-lg md:text-xl font-bold text-primary-foreground">
                  Mapa de Alojamientos
                </h1>
                <p className="text-xs md:text-sm text-primary-foreground/80">
                  {locations.length} ubicaciones en Castilla-La Mancha
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-primary-foreground/10 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-primary-foreground" />
            </button>
          </motion.header>

          {/* Content */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Map */}
            <div className="flex-1 relative bg-muted">
              {loadError ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="text-destructive mb-2">
                      Error al cargar el mapa
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {loadError.message}
                    </p>
                  </div>
                </div>
              ) : !isLoaded || loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Cargando mapa...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="text-destructive mb-2">{error}</p>
                    <button
                      onClick={fetchLocations}
                      className="text-primary underline"
                    >
                      Reintentar
                    </button>
                  </div>
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={getCenter()}
                  zoom={8}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                  }}
                >
                  {validLocations.map((location) => (
                    <Marker
                      key={location.id}
                      position={{ lat: location.lat!, lng: location.lng! }}
                      onClick={() => setSelectedLocation(location)}
                    />
                  ))}

                  {selectedLocation && selectedLocation.lat && selectedLocation.lng && (
                    <InfoWindow
                      position={{
                        lat: selectedLocation.lat,
                        lng: selectedLocation.lng,
                      }}
                      onCloseClick={() => setSelectedLocation(null)}
                    >
                      <div className="p-2">
                        <p className="font-semibold text-sm text-gray-900">
                          {selectedLocation.nombre}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {selectedLocation.direccion}
                        </p>
                        <button
                          onClick={() => openInGoogleMaps(selectedLocation)}
                          className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Abrir en Google Maps
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>

            {/* Locations List */}
            <motion.div
              className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-border bg-card overflow-y-auto max-h-[40vh] md:max-h-full"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-4">
                <h2 className="font-semibold text-foreground mb-3">
                  Listado de Alojamientos
                </h2>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-20 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : locations.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No hay alojamientos disponibles
                  </p>
                ) : (
                  <div className="space-y-2">
                    {locations.map((location) => (
                      <button
                        key={location.id}
                        onClick={() => openInGoogleMaps(location)}
                        className="w-full text-left p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                              {location.nombre}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {location.direccion}
                            </p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
