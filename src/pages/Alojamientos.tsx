import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Star, Phone, Globe, MapPin, Filter, X, Loader2, Building2, Search } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "react-router-dom";

// External Supabase client for locations data (ignoring local types)
const externalSupabase = createClient(
    "https://gxxawcabaumewbprimrw.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eGF3Y2FiYXVtZXdicHJpbXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYyMTcyMCwiZXhwIjoyMDg1MTk3NzIwfQ.VQcEsggIIoLDHf7DlDEF_p9987Q_96p8uM8G2IE36AQ"
);

// Gradientes atractivos para los alojamientos sin foto
const GRADIENTS = [
    'from-orange-400 to-rose-500',
    'from-blue-400 to-indigo-500',
    'from-emerald-400 to-teal-500',
    'from-purple-400 to-pink-500',
    'from-amber-400 to-orange-500',
];

interface Lugar {
    id: string;
    nombre: string;
    descripcion: string;
    direccion: string;
    ciudad: string;
    provincia: string;
    rating: number;
    place_id: string;
    telefono_nacional: string;
    telefono_internacional: string;
    sitio_web: string;
    url_google_maps: string;
}

// Componente para mostrar imagen del lugar
const PlaceImage = ({
    placeId,
    name,
    index,
    placesService
}: {
    placeId: string;
    name: string;
    index: number;
    placesService: google.maps.places.PlacesService | null;
}) => {
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!placeId || !placesService) {
            setLoading(false);
            if (!placesService) return; // Wait until loaded
            setError(true);
            return;
        }

        try {
            placesService.getDetails(
                {
                    placeId: placeId,
                    fields: ['photos']
                },
                (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK && place?.photos?.[0]) {
                        const url = place.photos[0].getUrl({ maxWidth: 600, maxHeight: 400 });
                        setPhotoUrl(url);
                        setLoading(false);
                    } else {
                        setLoading(false);
                        setError(true);
                    }
                }
            );
        } catch (err) {
            setLoading(false);
            setError(true);
        }
    }, [placeId, placesService]);

    const gradientClass = GRADIENTS[index % GRADIENTS.length] || GRADIENTS[0];

    if (loading) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-muted/60 absolute inset-0">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !photoUrl) {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-gradient-to-br ${gradientClass} absolute inset-0`}>
                <Building2 className="w-10 h-10 text-white/70" />
                <span className="text-white/80 text-xs mt-1 font-medium">Alojamiento</span>
            </div>
        );
    }

    return (
        <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 transition-transform duration-700"
            onError={() => setError(true)}
        />
    );
};

// Función para extraer ciudad de la dirección
const extractCity = (direccion: string): string => {
    if (!direccion) return 'Sin ciudad';
    const parts = direccion.split(',');
    if (parts.length >= 2) {
        const cityPart = parts[parts.length - 2].trim();
        const cityMatch = cityPart.match(/\d{5}\s*(.+)/);
        if (cityMatch) return cityMatch[1].trim();
        return cityPart;
    }
    return 'Sin ciudad';
};

const RATING_OPTIONS = [
    { value: 0, label: 'Todos' },
    { value: 4, label: '4+ ⭐' },
    { value: 4.5, label: '4.5+ ⭐' },
];

const Alojamientos = () => {
    const [lugares, setLugares] = useState<Lugar[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [minRating, setMinRating] = useState<number>(0);
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Contexto de google maps web para placesService
    const { isLoaded, loadError } = useGoogleMaps();
    const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

    // Div oculto para inicializar PlacesService si es necesario
    useEffect(() => {
        if (isLoaded && !placesService) {
            const div = document.createElement("div");
            setPlacesService(new google.maps.places.PlacesService(div));
        }
    }, [isLoaded, placesService]);

    useEffect(() => {
        // Hacemos scroll top al entrar
        window.scrollTo(0, 0);
        fetchLugares();
    }, []);

    const fetchLugares = async () => {
        try {
            setLoading(true);
            const { data, error } = await externalSupabase
                .from('lugares')
                .select('*')
                .order('rating', { ascending: false });

            if (error) throw error;

            // Type assertion seguro ya que la tabla se llama igual
            setLugares((data as unknown as Lugar[]) || []);
        } catch (err) {
            console.error('Error fetching lugares:', err);
            setError('Error al cargar los alojamientos');
        } finally {
            setLoading(false);
        }
    };

    const cities = useMemo(() => {
        const citySet = new Set<string>();
        lugares.forEach(lugar => {
            const city = extractCity(lugar.direccion);
            if (city !== 'Sin ciudad') citySet.add(city);
        });
        return Array.from(citySet).sort();
    }, [lugares]);

    const filteredLugares = useMemo(() => {
        return lugares.filter(lugar => {
            const city = extractCity(lugar.direccion);
            const matchesCity = !selectedCity || city === selectedCity;
            const matchesRating = !minRating || (lugar.rating && lugar.rating >= minRating);
            const matchesSearch = !searchQuery ||
                lugar.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                lugar.direccion.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCity && matchesRating && matchesSearch;
        });
    }, [lugares, selectedCity, minRating, searchQuery]);

    const clearFilters = () => {
        setSelectedCity('');
        setMinRating(0);
        setSearchQuery('');
    };

    const hasActiveFilters = selectedCity || minRating > 0 || searchQuery;

    return (
        <div className="min-h-screen bg-background flex flex-col pt-20">
            <Header variant="solid" />

            <main className="flex-1 container mx-auto px-4 max-w-5xl py-8">
                {/* Header Page */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Alojamientos Rurales</h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-base">
                            Explora {filteredLugares.length} de {lugares.length} lugares en Castilla-La Mancha
                        </p>
                    </div>

                    {/* Search & Filters Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar alojamiento..."
                                className="w-full pl-10 pr-10 py-2.5 text-sm border border-input rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2.5 rounded-full flex items-center justify-center gap-2 font-medium text-sm transition-colors shadow-sm border ${hasActiveFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-input text-foreground'}`}
                        >
                            <Filter size={18} />
                            <span>Filtros {hasActiveFilters && '*'}</span>
                        </button>
                    </div>
                </div>

                {/* Filters Panel Expandable */}
                {showFilters && (
                    <div className="bg-card border border-border rounded-xl p-4 sm:p-5 mb-8 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                            <span className="font-semibold text-foreground">Filtros Avanzados</span>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
                                >
                                    <X size={14} />
                                    Limpiar filtros
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* City Filter */}
                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">Ciudad</label>
                                <select
                                    value={selectedCity}
                                    onChange={(e) => setSelectedCity(e.target.value)}
                                    className="w-full px-4 py-2.5 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer shadow-sm"
                                >
                                    <option value="">Todas las ciudades</option>
                                    {cities.map(city => (
                                        <option key={city} value={city}>{city}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Rating Filter */}
                            <div>
                                <label className="text-sm font-medium text-foreground mb-2 block">Calificación mínima</label>
                                <div className="flex gap-2">
                                    {RATING_OPTIONS.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setMinRating(option.value)}
                                            className={`flex-1 py-2.5 px-3 text-sm font-medium rounded-lg border transition-colors shadow-sm ${minRating === option.value
                                                ? 'bg-primary text-primary-foreground border-primary'
                                                : 'bg-background text-muted-foreground border-input hover:border-primary/50 hover:bg-muted/50'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                <div className="pb-10">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground font-medium">Cargando increíbles alojamientos...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 text-center text-destructive py-10">
                            <p className="font-medium">{error}</p>
                            <button onClick={fetchLugares} className="mt-4 text-sm underline opacity-90 hover:opacity-100">
                                Intentar de nuevo
                            </button>
                        </div>
                    ) : filteredLugares.length === 0 ? (
                        <div className="text-center py-20 bg-muted/40 rounded-xl border border-dashed border-border">
                            <Building2 className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">No se encontraron resultados</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">No hay alojamientos que coincidan con tu búsqueda y filtros actuales.</p>
                            {hasActiveFilters && (
                                <button
                                    onClick={clearFilters}
                                    className="px-6 py-2 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors shadow-sm"
                                >
                                    Limpiar todos los filtros
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredLugares.map((lugar, index) => (
                                <div
                                    key={lugar.id}
                                    className="group bg-card rounded-2xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col"
                                >
                                    {/* Image Area */}
                                    <div className="relative h-56 md:h-60 w-full overflow-hidden bg-muted">
                                        <PlaceImage placeId={lugar.place_id} name={lugar.nombre} index={index} placesService={placesService} />

                                        {/* Overlay gradient bottom for readability */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 z-10" />

                                        {/* Rating badge */}
                                        {lugar.rating && (
                                            <div className="absolute top-4 right-4 z-20 bg-background/95 backdrop-blur-md px-2.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border border-border/50">
                                                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                                                <span className="text-xs font-bold text-foreground">{lugar.rating}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Area */}
                                    <div className="p-5 flex flex-col flex-1">
                                        <h3 className="font-bold text-lg text-foreground mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">
                                            {lugar.nombre}
                                        </h3>

                                        <div className="flex items-start gap-1.5 text-muted-foreground text-sm mb-4">
                                            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary/70" />
                                            <span className="line-clamp-2 leading-tight">{lugar.direccion}</span>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-border flex flex-wrap items-center gap-3">
                                            {lugar.telefono_nacional && (
                                                <a
                                                    href={`tel:${lugar.telefono_internacional}`}
                                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                        <Phone className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="hidden sm:inline">Llamar</span>
                                                </a>
                                            )}

                                            {lugar.sitio_web && (
                                                <a
                                                    href={lugar.sitio_web}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80 hover:text-primary transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                        <Globe className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="hidden sm:inline">Web</span>
                                                </a>
                                            )}

                                            {lugar.url_google_maps && (
                                                <a
                                                    href={lugar.url_google_maps}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="ml-auto inline-flex items-center text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-full hover:bg-primary/90 transition-all shadow-[0_2px_10px_-3px_var(--tw-shadow-color)] shadow-primary/30 hover:shadow-primary/50"
                                                >
                                                    Mapas
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default Alojamientos;
