import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Loader2, ExternalLink } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import "leaflet/dist/leaflet.css";

// Fix for default marker icon in Leaflet with webpack/vite
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

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

export const LocationsMap = ({ isOpen, onClose }: LocationsMapProps) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "get-locations"
      );

      if (fnError) {
        throw fnError;
      }

      if (data?.locations) {
        setLocations(data.locations);
      }
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

  // Calculate center based on locations or default to Castilla-La Mancha
  const getCenter = (): [number, number] => {
    if (validLocations.length > 0) {
      const avgLat = validLocations.reduce((sum, loc) => sum + (loc.lat || 0), 0) / validLocations.length;
      const avgLng = validLocations.reduce((sum, loc) => sum + (loc.lng || 0), 0) / validLocations.length;
      return [avgLat, avgLng];
    }
    return [39.4, -3.0]; // Center of Castilla-La Mancha
  };

  const openInGoogleMaps = (location: Location) => {
    const url = location.lat && location.lng
      ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.direccion)}`;
    
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
              {loading ? (
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
                <MapContainer
                  center={getCenter()}
                  zoom={8}
                  className="w-full h-full"
                  style={{ minHeight: "300px" }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {validLocations.map((location) => (
                    <Marker
                      key={location.id}
                      position={[location.lat!, location.lng!]}
                    >
                      <Popup>
                        <div className="p-1">
                          <p className="font-semibold text-sm">{location.nombre}</p>
                          <p className="text-xs text-muted-foreground mt-1">{location.direccion}</p>
                          <button
                            onClick={() => openInGoogleMaps(location)}
                            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            Abrir en Google Maps
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
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
