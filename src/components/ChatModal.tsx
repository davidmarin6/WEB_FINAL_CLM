import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, MapPin, Home, Star } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import casaRural1 from "@/assets/casa-rural-1.jpg";
import casaRural2 from "@/assets/casa-rural-2.jpg";

interface Message {
  id: number;
  type: "user" | "bot";
  content: string;
  image?: string;
  suggestions?: string[];
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

export const ChatModal = ({ isOpen, onClose }: ChatModalProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
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

  const simulateBotResponse = (userMessage: string) => {
    setIsTyping(true);
    
    setTimeout(() => {
      const responses: Message[] = [];
      
      if (userMessage.toLowerCase().includes("piscina") || userMessage.toLowerCase().includes("verano")) {
        responses.push({
          id: Date.now(),
          type: "bot",
          content: "¡Excelente elección! 🏊‍♂️ He encontrado varias casas rurales con piscina privada. Aquí tienes una de las más valoradas:",
        });
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: "bot",
            content: "**Casa Rural El Molino** - Toledo\n⭐ 4.9 (127 reseñas) • Desde 120€/noche\n\nPiscina privada, jardín amplio, 6 personas. A 15 min del casco histórico de Toledo.",
            image: casaRural1,
            suggestions: ["Ver más opciones", "Reservar ahora", "Otra ubicación"]
          }]);
          setIsTyping(false);
        }, 1200);
      } else if (userMessage.toLowerCase().includes("romántic") || userMessage.toLowerCase().includes("pareja")) {
        responses.push({
          id: Date.now(),
          type: "bot",
          content: "💕 ¡Una escapada romántica! Tengo opciones perfectas para parejas con encanto y privacidad:",
        });
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            type: "bot",
            content: "**La Casita del Viñedo** - Cuenca\n⭐ 5.0 (89 reseñas) • Desde 95€/noche\n\nCasa con encanto entre viñedos, chimenea, jacuzzi privado y vistas espectaculares a la serranía.",
            image: casaRural2,
            suggestions: ["Ver disponibilidad", "Más opciones románticas", "Añadir experiencias"]
          }]);
          setIsTyping(false);
        }, 1200);
      } else {
        responses.push({
          id: Date.now(),
          type: "bot",
          content: "Entendido 👍 Para darte las mejores recomendaciones, cuéntame un poco más:",
          suggestions: ["¿Cuántas personas sois?", "¿Qué provincia prefieres?", "¿Fechas de tu viaje?", "¿Presupuesto aproximado?"]
        });
        setMessages(prev => [...prev, ...responses]);
        setIsTyping(false);
      }
      
      if (responses.length > 0 && !responses[0].content.includes("Excelente") && !responses[0].content.includes("romántica")) {
        // Already handled above
      } else if (responses.length > 0) {
        setMessages(prev => [...prev, responses[0]]);
      }
    }, 1500);
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
    simulateBotResponse(inputValue);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const userMessage: Message = {
      id: Date.now(),
      type: "user",
      content: suggestion
    };
    
    setMessages(prev => [...prev, userMessage]);
    simulateBotResponse(suggestion);
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
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className="fixed inset-4 md:inset-auto md:right-6 md:bottom-6 md:w-[440px] md:h-[600px] z-50 flex flex-col bg-background rounded-2xl shadow-2xl overflow-hidden border border-border"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary to-accent border-b border-border">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={logoIcon} alt="viajaCLM" className="w-10 h-10 rounded-xl" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-primary-foreground">viajaCLM Asistente</h3>
                  <p className="text-xs text-primary-foreground/70 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Siempre disponible
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={`max-w-[85%] ${message.type === "user" ? "order-2" : "order-1"}`}>
                    {message.type === "bot" && (
                      <div className="flex items-center gap-2 mb-1">
                        <img src={logoIcon} alt="" className="w-6 h-6 rounded-lg" />
                        <span className="text-xs text-muted-foreground">viajaCLM</span>
                      </div>
                    )}
                    
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.type === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border rounded-bl-md shadow-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                      
                      {message.image && (
                        <div className="mt-3 rounded-xl overflow-hidden">
                          <img 
                            src={message.image} 
                            alt="Alojamiento rural" 
                            className="w-full h-32 object-cover hover:scale-105 transition-transform cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                    
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors border border-primary/20"
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
                  <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <motion.span
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.span
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 border-t border-border bg-background">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {[
                  { icon: MapPin, label: "Ubicación" },
                  { icon: Home, label: "Tipo de casa" },
                  { icon: Star, label: "Mejor valorado" },
                ].map((action, idx) => (
                  <button
                    key={idx}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-xs text-muted-foreground whitespace-nowrap transition-colors"
                    onClick={() => handleSuggestionClick(action.label)}
                  >
                    <action.icon className="w-3.5 h-3.5" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 px-4 py-3 bg-muted rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
                  className="p-3 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all hover:scale-105 active:scale-95"
                >
                  <Send className="w-5 h-5 text-primary-foreground" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
