import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, MapPin, Home, Star, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import logoIcon from "@/assets/logo-icon.png";
import heroLandscape from "@/assets/hero-landscape.jpg";
import { fetchPlacePhoto } from "@/lib/api/googlePlaces";
import { PlacePhotoCard } from "@/components/PlacePhotoCard";
import { LocationsMap } from "@/components/LocationsMap";

interface PlacePhoto {
  url: string;
  photoUrl?: string;
  placeName?: string;
  loading: boolean;
}

interface ContentBlock {
  text: string;
  mapsUrl?: string;
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

const extractPlaceQueryHint = (content: string): string | undefined => {
  // Fallback: first accommodation in the message
  const name = content.match(/🏡\s*(?:\*\*)?([^\n*]+?)(?:\*\*)?\s*$/m)?.[1]?.trim();
  const address = content.match(/📍\s*([^\n]+)/)?.[1]?.trim();
  const hint = [name, address].filter(Boolean).join(", ").trim();
  return hint ? hint : undefined;
};

const extractPerUrlQueryHints = (content: string, mapsUrlRegex: RegExp): Record<string, string> => {
  // Split by accommodation blocks (🏡 ...) and compute a hint per block.
  const blocks = content.split(/(?=🏡)/g);
  const hints: Record<string, string> = {};

  for (const block of blocks) {
    const urls = block.match(mapsUrlRegex) || [];
    if (urls.length === 0) continue;

    const name = block.match(/🏡\s*(?:\*\*)?([^\n*]+?)(?:\*\*)?\s*$/m)?.[1]?.trim();
    const address = block.match(/📍\s*([^\n]+)/)?.[1]?.trim();
    const hint = [name, address].filter(Boolean).join(", ").trim();
    if (!hint) continue;

    for (const url of urls) {
      hints[url] = hint;
    }
  }

  return hints;
};

const splitContentIntoBlocks = (content: string, mapsUrlRegex: RegExp): ContentBlock[] => {
  // Split content by accommodation blocks (🏡), keeping the delimiter
  const rawBlocks = content.split(/(?=🏡)/g);
  const result: ContentBlock[] = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const urls = trimmed.match(mapsUrlRegex) || [];
    const mapsUrl = urls.length > 0 ? urls[0] : undefined;

    result.push({
      text: trimmed,
      mapsUrl,
    });
  }

  // If no blocks were created (no 🏡 markers), return the whole content as one block
  if (result.length === 0 && content.trim()) {
    const urls = content.match(mapsUrlRegex) || [];
    result.push({
      text: content.trim(),
      mapsUrl: urls.length > 0 ? urls[0] : undefined,
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
        // Response is plain text, use it directly
        content = responseText;
      }
      
      // Extract Google Maps URLs and prepare for photo fetching
      const mapsUrlRegex = /https?:\/\/(?:www\.)?(?:google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|goo\.gl\/maps)[^\s)>\]]+/gi;
      const mapsUrls = content.match(mapsUrlRegex) || [];

      const globalQueryHint = extractPlaceQueryHint(content);
      const perUrlHints = extractPerUrlQueryHints(content, mapsUrlRegex);
      
      const placePhotos: PlacePhoto[] = mapsUrls.map(url => ({
        url,
        loading: true,
      }));

      const contentBlocks = splitContentIntoBlocks(content, mapsUrlRegex);
      
      const botMessage: Message = {
        id: Date.now(),
        type: "bot",
        content,
        image,
        suggestions,
        placePhotos: placePhotos.length > 0 ? placePhotos : undefined,
        contentBlocks: contentBlocks.length > 0 ? contentBlocks : undefined,
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Fetch photos for each Google Maps URL
      if (placePhotos.length > 0) {
        const messageId = botMessage.id;
        
        for (const placePhoto of placePhotos) {
          const hintForThisUrl = perUrlHints[placePhoto.url] || globalQueryHint;
          fetchPlacePhoto(placePhoto.url, hintForThisUrl).then(result => {
            setMessages(prev => prev.map(msg => {
              if (msg.id !== messageId || !msg.placePhotos) return msg;
              
              return {
                ...msg,
                placePhotos: msg.placePhotos.map(pp => 
                  pp.url === placePhoto.url 
                    ? { 
                        ...pp, 
                        loading: false, 
                        photoUrl: result.success ? result.photoUrl : undefined,
                        placeName: result.success ? result.placeName : undefined,
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
      
      // Show error message to user
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
                      className={`rounded-2xl px-5 py-4 ${
                        message.type === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border rounded-bl-md shadow-md"
                      }`}
                    >
                      {/* Render content blocks with inline photos */}
                      {message.contentBlocks && message.contentBlocks.length > 0 ? (
                        <div className="space-y-4">
                          {message.contentBlocks.map((block, blockIdx) => {
                            const placePhoto = block.mapsUrl
                              ? message.placePhotos?.find(pp => pp.url === block.mapsUrl)
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
                      <div className="flex gap-1.5">
                        <motion.span
                          className="w-2.5 h-2.5 bg-muted-foreground rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        />
                        <motion.span
                          className="w-2.5 h-2.5 bg-muted-foreground rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.span
                          className="w-2.5 h-2.5 bg-muted-foreground rounded-full"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        />
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
