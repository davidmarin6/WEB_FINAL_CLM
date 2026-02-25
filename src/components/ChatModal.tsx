import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, MapPin, Home, Star, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import logoIcon from "@/assets/logo-icon.png";
import heroLandscape from "@/assets/hero-landscape.jpg";
import { fetchPlacePhoto } from "@/lib/api/googlePlaces";
import { PlacePhotoCard } from "@/components/PlacePhotoCard";
import { LocationsMap } from "@/components/LocationsMap";
import { createClient } from "@supabase/supabase-js";

const externalSupabase = createClient(
  "https://gxxawcabaumewbprimrw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4eGF3Y2FiYXVtZXdicHJpbXJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYyMTcyMCwiZXhwIjoyMDg1MTk3NzIwfQ.VQcEsggIIoLDHf7DlDEF_p9987Q_96p8uM8G2IE36AQ"
);

interface PlacePhoto {
  url: string;
  query?: string; // Stable ID form original block
  photoUrl?: string;
  placeName?: string; // Display name
  loading: boolean;
}

interface ContentBlock {
  text: string;
  mapsUrl?: string;
  placeQuery?: string;
}

interface Message {
  id: number;
  type: "user" | "bot";
  content: string;
  image?: string;
  suggestions?: string[];
  placePhotos?: PlacePhoto[];
  contentBlocks?: ContentBlock[];
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialMessages: Message[] = [
  {
    id: 1,
    type: "bot",
    content: "¡Hola! 👋 Soy tu asistente de viajaCLM. Estoy aquí para ayudarte a encontrar el alojamiento rural perfecto en Castilla-La Mancha. ¿Qué tipo de experiencia estás buscando?",
    suggestions: ["Casa con piscina", "Escapada romántica", "Familia con niños", "Grupo de amigos"]
  }
];

const PLACE_EMOJIS = ['🏡', '📍', '🏨', '🍽️', '🏰', '🌲', '🏞️', '✨', '🏕️', '☕', '🏛️', '⛪', '🛏️', '🏠', '🏘️', '🍺', '🍷', '🌿'];
const EMOJI_REGEX_STR = `(?:${PLACE_EMOJIS.join('|')})`;

// Extract place name and address from a content block
const extractPlaceQuery = (text: string): string | undefined => {
  let rawName = '';

  // 1. Emojis comunes (captura el nombre después del emoji)
  const emojiMatch = text.match(new RegExp(`${EMOJI_REGEX_STR}\\s*\\*{0,2}([^\\n*]+?)\\*{0,2}\\s*(?:${EMOJI_REGEX_STR}|\\n|:|-|$)`));
  if (emojiMatch) rawName = emojiMatch[1];

  // 2. Elemento de lista numerado (ej. 1. **Lugar**: ...)
  if (!rawName) {
    const numMatch = text.match(/^(?:#{1,3}\s*)?\d+\.\s+\*{0,2}([^\n*:—–]+?)\*{0,2}\s*(?:[:\-–\n]|$)/m);
    if (numMatch) rawName = numMatch[1];
  }

  // 3. Negrita al iniciar línea (ej. **Lugar:** ...)
  if (!rawName) {
    const boldMatch = text.match(/^(?:[-*]\s*)?\*\*([^\n]+?)\*\*/m);
    if (boldMatch) {
      rawName = boldMatch[1].replace(/[:\-–—]$/, '').trim();
    }
  }

  if (rawName) {
    // Limpiar asteriscos y paréntesis
    const name = rawName.replace(/\*\*/g, '').replace(/[()"]/g, '').trim();

    // Filtro estricto de cabeceras comunes de itinerarios
    const isHeader = (str: string) => {
      const n = str.toLowerCase().trim().replace(/[:.\-]/g, '').trim();
      if (/^d[ií]a\s*\d+/.test(n)) return true; // "Día 1", "Dia 2"
      if (/^(viernes|s[aá]bado|domingo)/.test(n)) return true; // Días de fin de semana
      if (/^(mañana|por la mañana|tarde|por la tarde|noche|por la noche)$/.test(n)) return true;
      if (/^(visitas|visita monumentos|monumentos|alojamiento|opcional|llegada|salida|excursi[oó]n|excursiones|actividades|itinerario|ruta)$/.test(n)) return true;
      if (/^(desayuno|almuerzo|comida|cena|restaurante|d[oó]nde comer)$/.test(n)) return true; // Cabeceras puras de comidas
      if (/^llegada a /.test(n)) return true;
      if (/^(plan|opciones?\s*de|idea)/.test(n)) return true;
      // Filter out general list headers like "Lugares para visitar"
      if (str.toLowerCase().includes('lugares') || str.toLowerCase().includes('opciones')) return true;
      return false;
    };

    if (isHeader(name)) {
      return undefined;
    }

    console.log(`[PhotoExtract] Found: "${name}"`);
    return name;
  }
  return undefined;
};

const splitContentIntoBlocks = (content: string): ContentBlock[] => {
  const result: ContentBlock[] = [];

  // Separar en bloques basándose en inicios de nuevo punto (emojis, lista numerada, o texto en negrita inicial)
  const splitRegex = new RegExp(`\\n(?=${EMOJI_REGEX_STR}|(?:(?:#{1,3}\\s*)?\\d+\\.\\s+\\*{0,2})|(?:(?:[-*]\\s*)?\\*\\*(?:.+?)\\*\\*))`, 'g');
  const blocks = content.split(splitRegex);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const mapsUrls = trimmed.match(/https?:\/\/(?:www\.)?(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|goo\.gl\/maps)[^\s)>\]]+/gi) || [];
    result.push({
      text: trimmed,
      mapsUrl: mapsUrls[0],
      placeQuery: extractPlaceQuery(trimmed)
    });
  }

  return result;
};

export const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [showMap, setShowMap] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessageToN8N = async (userMessage: string) => {
    setIsTyping(true);

    try {
      const response = await fetch(
        "https://n8nproject-n8n.78uzpw.easypanel.host/webhook/0ae4a30d-71bc-4812-bda1-59efdcb21032",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage,
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Get the response as text first
      const responseText = await response.text();

      let content = "";
      let image: string | undefined;
      let suggestions: string[] | undefined;

      // Try to parse as JSON, otherwise use as plain text
      try {
        const data = JSON.parse(responseText);
        content = data.message || data.response || data.text || data.output || responseText;
        image = data.image;
        suggestions = data.suggestions;
      } catch {
        content = responseText;
      }

      // Normalizar saltos de línea antes de procesar (el bot puede devolver \r\n)
      const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const contentBlocks = splitContentIntoBlocks(normalizedContent);

      // Create potential photo states based on blocks with placeQuery or mapsUrl
      const potentialPhotos: PlacePhoto[] = contentBlocks
        .filter(block => block.placeQuery || block.mapsUrl)
        .map(block => ({
          url: block.mapsUrl || "",
          query: block.placeQuery, // Store original query for stable matching
          placeName: block.placeQuery, // Initial display name
          loading: true,
        }));

      const initialPlacePhotos: PlacePhoto[] = [];

      // Validar contra la base de datos
      for (const photo of potentialPhotos) {
        if (photo.query) {
          try {
            // Limpiar comunes para búsqueda flexible
            let searchStr = photo.query.trim().replace(/^(Hotel|Casa rural|Restaurante|Hostal|Apartamento)\s+/i, '');
            // Buscamos si existe algun lugar en la BD que contenga el nombre sugerido
            const { data } = await externalSupabase
              .from("lugares")
              .select("id")
              .ilike("nombre", `%${searchStr}%`)
              .limit(1);

            if (data && data.length > 0) {
              initialPlacePhotos.push(photo);
            } else {
              console.log(`[PhotoExtract] "${photo.query}" no encontrado en la base de datos.`);
            }
          } catch (error) {
            console.error("Error validando el lugar en Supabase:", error);
          }
        }
      }

      const botMessage: Message = {
        id: Date.now(),
        type: "bot",
        content: normalizedContent,
        image,
        suggestions,
        placePhotos: initialPlacePhotos.length > 0 ? initialPlacePhotos : undefined,
        contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
      };

      setMessages(prev => [...prev, botMessage]);

      // Fetch photos for each identified place (only those in DB)
      if (initialPlacePhotos.length > 0) {
        const messageId = botMessage.id;

        for (const photoRequest of initialPlacePhotos) {
          // Si tenemos nombre extraído (placeQuery), usamos ese. Si no, extraemos de la URL si existe.
          const searchQuery = photoRequest.query || (photoRequest.url ? undefined : undefined);

          fetchPlacePhoto(photoRequest.url, searchQuery).then(result => {
            setMessages(prev => prev.map(msg => {
              if (msg.id !== messageId || !msg.placePhotos) return msg;

              return {
                ...msg,
                placePhotos: msg.placePhotos.map(pp =>
                  // Coincidencia por URL (si existe) o por query estable
                  (
                    (pp.url && pp.url === photoRequest.url) ||
                    (pp.query && pp.query === photoRequest.query)
                  )
                    ? {
                      ...pp,
                      loading: false,
                      photoUrl: result.success ? result.photoUrl : undefined,
                      placeName: result.success ? result.placeName : (pp.placeName || "Lugar"),
                    }
                    : pp
                ),
              };
            }));
          });
        }
      }
    } catch (error) {
      console.error("Error connecting to n8n:", error);

      const errorMessage: Message = {
        id: Date.now(),
        type: "bot",
        content: "Lo siento, ha ocurrido un error al conectar con el asistente. Por favor, inténtalo de nuevo.",
        suggestions: ["Reintentar", "Ver opciones populares"],
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: inputValue
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    sendMessageToN8N(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: suggestion
    };

    setMessages(prev => [...prev, userMessage]);
    sendMessageToN8N(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

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
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <img src={heroLandscape} alt="" className="w-full h-full object-cover" />
          </div>

          {/* Header */}
          <motion.header
            className="relative flex items-center justify-between px-4 md:px-8 py-4 bg-gradient-to-r from-primary to-accent"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-primary-foreground/10 rounded-xl transition-colors mr-2"
              >
                <ArrowLeft className="w-6 h-6 text-primary-foreground" />
              </button>
              <div className="relative">
                <img src={logoIcon} alt="viajaCLM" className="w-12 h-12 rounded-xl" />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-primary" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-primary-foreground">viajaCLM Asistente</h1>
                <p className="text-xs md:text-sm text-primary-foreground/80 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
                  Tu guía turístico inteligente
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-primary-foreground/10 rounded-xl transition-colors hidden md:flex"
            >
              <X className="w-6 h-6 text-primary-foreground" />
            </button>
          </motion.header>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto relative">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`max-w-[85%] md:max-w-[70%] ${message.type === "user" ? "order-2" : "order-1"}`}>
                    {message.type === "bot" && (
                      <div className="flex items-center gap-2 mb-2">
                        <img src={logoIcon} alt="" className="w-8 h-8 rounded-lg" />
                        <span className="text-sm font-medium text-muted-foreground">viajaCLM</span>
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-5 py-4 ${message.type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border rounded-bl-md shadow-md"
                        }`}
                    >
                      {/* Render content blocks with inline photos */}
                      {message.contentBlocks && message.contentBlocks.length > 0 ? (
                        <div className="space-y-4">
                          {message.contentBlocks.map((block, blockIdx) => {
                            // Find photo for this block based on Query or URL match
                            // Use strict matching logic to ensure we find the right photo object
                            const placePhoto = block.mapsUrl
                              ? message.placePhotos?.find(pp => pp.url === block.mapsUrl)
                              : block.placeQuery
                                ? message.placePhotos?.find(pp => pp.query === block.placeQuery)
                                : undefined;

                            return (
                              <div key={blockIdx}>
                                <div className="text-base leading-relaxed prose prose-sm max-w-none prose-a:text-primary prose-a:underline prose-a:font-medium hover:prose-a:text-primary/80">
                                  <ReactMarkdown
                                    components={{
                                      a: ({ href, children }) => (
                                        <a
                                          href={href}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!href) return;
                                            const topWindow = window.top || window.parent || window;
                                            topWindow.open(href, "_blank", "noopener,noreferrer");
                                          }}
                                          className="text-primary underline font-medium hover:text-primary/80 transition-colors pointer-events-auto cursor-pointer"
                                        >
                                          {children}
                                        </a>
                                      ),
                                    }}
                                  >
                                    {block.text}
                                  </ReactMarkdown>
                                </div>
                                {placePhoto && (
                                  <PlacePhotoCard
                                    url={placePhoto.url}
                                    photoUrl={placePhoto.photoUrl}
                                    placeName={placePhoto.placeName}
                                    loading={placePhoto.loading}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-base leading-relaxed prose prose-sm max-w-none prose-a:text-primary prose-a:underline prose-a:font-medium hover:prose-a:text-primary/80">
                          <ReactMarkdown
                            components={{
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!href) return;
                                    const topWindow = window.top || window.parent || window;
                                    topWindow.open(href, "_blank", "noopener,noreferrer");
                                  }}
                                  className="text-primary underline font-medium hover:text-primary/80 transition-colors pointer-events-auto cursor-pointer"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )}

                      {message.image && (
                        <div className="mt-4 rounded-xl overflow-hidden">
                          <img
                            src={message.image}
                            alt="Alojamiento rural"
                            className="w-full h-48 md:h-56 object-cover hover:scale-105 transition-transform duration-500 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-sm px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all hover:scale-105 border border-primary/20"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <img src={logoIcon} alt="" className="w-8 h-8 rounded-lg" />
                    <div className="bg-card border border-border rounded-2xl rounded-bl-md px-5 py-4 shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          <motion.span
                            className="w-2 h-2 bg-primary/60 rounded-full"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          />
                          <motion.span
                            className="w-2 h-2 bg-primary/60 rounded-full"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          />
                          <motion.span
                            className="w-2 h-2 bg-primary/60 rounded-full"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          />
                        </div>
                        <span className="text-sm font-medium text-muted-foreground animate-pulse">
                          Analizando viaje...
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="relative border-t border-border bg-background/80 backdrop-blur-sm">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm text-muted-foreground whitespace-nowrap transition-all hover:scale-105"
                  onClick={() => setShowMap(true)}
                >
                  <MapPin className="w-4 h-4" />
                  Ver mapa
                </button>
                {[
                  { icon: Home, label: "Tipos de casa" },
                  { icon: Star, label: "Mejor valorados" },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-full text-sm text-muted-foreground whitespace-nowrap transition-all hover:scale-105"
                    onClick={() => handleSuggestionClick(action.label)}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Locations Map Modal */}
          <LocationsMap isOpen={showMap} onClose={() => setShowMap(false)} />

          {/* Input */}
          <motion.div
            className="relative border-t border-border bg-background px-4 py-4 md:py-6"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe lo que buscas... (ej: casa rural con piscina en Toledo)"
                  className="flex-1 px-5 py-4 bg-muted rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="px-6 py-4 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="w-6 h-6 text-primary-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
