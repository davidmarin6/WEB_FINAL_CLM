import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Loader2, ExternalLink, Building2, Star, Phone, Globe } from "lucide-react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { createClient } from "@supabase/supabase-js";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";

// CSS para evitar scroll en el InfoWindow de Google Maps
const infoWindowStyles = document.createElement('style');
infoWindowStyles.textContent = `
  .gm-style-iw-c { padding: 0 !important; overflow: hidden !important; max-height: none !important; }
  .gm-style-iw-d { overflow: hidden !important; max-height: none !important; }
  .gm-style-iw-t::after { display: none; }
`;
document.head.appendChild(infoWindowStyles);

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
  rating?: number;
  place_id?: string;
  telefono_nacional?: string;
  telefono_internacional?: string;
  sitio_web?: string;
  url_google_maps?: string;
}

// Componente para el contenido del InfoWindow con foto
const InfoWindowContent = ({
  location,
  placesService,
}: {
  location: Location;
  placesService: google.maps.places.PlacesService | null;
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);

  useEffect(() => {
    if (!placesService) {
      setPhotoLoading(false);
      return;
    }

    const tryGetDetails = () => {
      if (!location.place_id) {
        // No place_id, go straight to textSearch
        tryTextSearch();
        return;
      }

      placesService.getDetails(
        {
          placeId: location.place_id,
          fields: ["photos"],
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.photos?.[0]) {
            const url = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 200 });
            setPhotoUrl(url);
            setPhotoLoading(false);
          } else {
            // Fallback to textSearch
            tryTextSearch();
          }
        }
      );
    };

    const tryTextSearch = () => {
      placesService.textSearch(
        { query: location.nombre + " Castilla-La Mancha España" },
        (results, status) => {
          if (
            status === google.maps.places.PlacesServiceStatus.OK &&
            results &&
            results[0]?.photos?.[0]
          ) {
            const url = results[0].photos[0].getUrl({ maxWidth: 400, maxHeight: 200 });
            setPhotoUrl(url);
          }
          setPhotoLoading(false);
        }
      );
    };

    tryGetDetails();
  }, [location.place_id, location.nombre, placesService]);

  return (
    <div style={{ width: '280px', background: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Foto de portada con overlay de rating */}
      <div style={{ position: 'relative', width: '100%', height: '120px', overflow: 'hidden' }}>
        {photoLoading ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
          }}>
            <Loader2 style={{ width: '24px', height: '24px', animation: 'spin 1s linear infinite', color: '#9ca3af' }} />
          </div>
        ) : photoUrl ? (
          <img
            src={photoUrl}
            alt={location.nombre}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #3b82f6 100%)'
          }}>
            <Building2 style={{ width: '36px', height: '36px', color: 'rgba(255,255,255,0.85)' }} />
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '11px', marginTop: '4px', fontWeight: '500' }}>Alojamiento</span>
          </div>
        )}

        {/* Badge de rating superpuesto */}
        {location.rating && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
            padding: '3px 8px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            <Star style={{ width: '13px', height: '13px', color: '#eab308', fill: '#eab308' }} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#1f2937' }}>{location.rating}</span>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div style={{ padding: '12px 14px 14px 14px' }}>
        {/* Nombre */}
        <h3 style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#1f2937',
          margin: '0 0 6px 0',
          lineHeight: '1.3',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {location.nombre}
        </h3>

        {/* Dirección con icono */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginBottom: '10px' }}>
          <MapPin style={{ width: '12px', height: '12px', color: '#f97316', marginTop: '1px', flexShrink: 0 }} />
          <p style={{
            fontSize: '11px',
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {location.direccion}
          </p>
        </div>

        {/* Acciones en fila */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {location.telefono_nacional && (
            <a
              href={`tel:${location.telefono_internacional}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                background: '#f3f4f6',
                borderRadius: '16px',
                fontSize: '11px',
                color: '#374151',
                textDecoration: 'none',
                fontWeight: 500,
                border: '1px solid #e5e7eb'
              }}
            >
              <Phone style={{ width: '11px', height: '11px', color: '#f97316' }} />
              Llamar
            </a>
          )}

          {location.sitio_web && (
            <a
              href={location.sitio_web}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                background: '#f3f4f6',
                borderRadius: '16px',
                fontSize: '11px',
                color: '#374151',
                textDecoration: 'none',
                fontWeight: 500,
                border: '1px solid #e5e7eb'
              }}
            >
              <Globe style={{ width: '11px', height: '11px', color: '#3b82f6' }} />
              Web
            </a>
          )}

          {location.url_google_maps && (
            <a
              href={location.url_google_maps}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                borderRadius: '16px',
                fontSize: '11px',
                color: 'white',
                textDecoration: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 6px rgba(249, 115, 22, 0.3)'
              }}
            >
              🗺️ Maps
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

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

// Tarjeta individual con foto de Google Places
const LocationCard = ({
  location,
  placesService,
  onClick,
}: {
  location: Location;
  placesService: google.maps.places.PlacesService | null;
  onClick: () => void;
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(true);

  useEffect(() => {
    if (!placesService) {
      setPhotoLoading(false);
      return;
    }

    placesService.textSearch(
      { query: location.nombre + " Castilla-La Mancha España" },
      (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results &&
          results[0]?.photos?.[0]
        ) {
          setPhotoUrl(results[0].photos[0].getUrl({ maxWidth: 400, maxHeight: 200 }));
        }
        setPhotoLoading(false);
      }
    );
  }, [location.nombre, placesService]);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all group shadow-sm hover:shadow-md"
    >
      {/* Foto */}
      <div className="w-full h-36 relative overflow-hidden bg-muted">
        {photoLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-muted animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : photoUrl ? (
          <img
            src={photoUrl}
            alt={location.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <Building2 className="w-10 h-10 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Info */}
      <div className="p-3 flex items-start gap-2">
        <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
            {location.nombre}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {location.direccion}
          </p>
        </div>
        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
      </div>
    </button>
  );
};

export const LocationsMap = ({ isOpen, onClose }: LocationsMapProps) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const placesRef = useRef<HTMLDivElement>(null);

  // Inicializar PlacesService cuando Maps esté cargado
  useEffect(() => {
    if (isLoaded && placesRef.current && !placesService) {
      setPlacesService(new google.maps.places.PlacesService(placesRef.current));
    }
  }, [isLoaded, placesService]);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: lugares, error: fetchError } = await externalSupabase
        .from("lugares")
        .select("*");

      if (fetchError) throw fetchError;

      const locationsData: Location[] = (lugares || []).map(
        (lugar: any) => ({
          id: lugar.id,
          nombre: lugar.nombre,
          direccion: lugar.direccion,
          lat: lugar.latitud,
          lng: lugar.longitud,
          rating: lugar.rating,
          place_id: lugar.place_id,
          telefono_nacional: lugar.telefono_nacional,
          telefono_internacional: lugar.telefono_internacional,
          sitio_web: lugar.sitio_web,
          url_google_maps: lugar.url_google_maps,
        })
      );

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
      const avgLat = validLocations.reduce((sum, loc) => sum + (loc.lat || 0), 0) / validLocations.length;
      const avgLng = validLocations.reduce((sum, loc) => sum + (loc.lng || 0), 0) / validLocations.length;
      return { lat: avgLat, lng: avgLng };
    }
    return defaultCenter;
  };

  const openInGoogleMaps = (location: Location) => {
    const url =
      location.lat && location.lng
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
          {/* Hidden div para PlacesService */}
          <div ref={placesRef} style={{ display: "none" }} />

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
                    <p className="text-destructive mb-2">Error al cargar el mapa</p>
                    <p className="text-sm text-muted-foreground">{loadError.message}</p>
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
                    <button onClick={fetchLocations} className="text-primary underline">
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
                      title={location.nombre}
                      icon={{
                        url: '/windmill-marker.png',
                        scaledSize: new google.maps.Size(52, 52),
                        anchor: new google.maps.Point(26, 52)
                      }}
                    />
                  ))}

                  {selectedLocation && selectedLocation.lat && selectedLocation.lng && (
                    <InfoWindow
                      position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                      onCloseClick={() => setSelectedLocation(null)}
                      options={{ maxWidth: 320, disableAutoPan: false }}
                    >
                      <InfoWindowContent location={selectedLocation} placesService={placesService} />
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>

            {/* Locations List con fotos */}
            <motion.div
              className="w-full md:w-80 lg:w-96 border-t md:border-t-0 md:border-l border-border bg-card overflow-y-auto max-h-[50vh] md:max-h-full"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="p-4">
                <h2 className="font-semibold text-foreground mb-4">
                  Listado de Alojamientos
                </h2>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="rounded-xl overflow-hidden border border-border">
                        <div className="h-36 bg-muted animate-pulse" />
                        <div className="p-3 space-y-2">
                          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                          <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : locations.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No hay alojamientos disponibles
                  </p>
                ) : (
                  <div className="space-y-4">
                    {locations.map((location) => (
                      <LocationCard
                        key={location.id}
                        location={location}
                        placesService={placesService}
                        onClick={() => openInGoogleMaps(location)}
                      />
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
