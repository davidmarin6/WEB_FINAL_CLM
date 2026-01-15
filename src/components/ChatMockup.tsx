import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logoIcon from "@/assets/logo-icon.png";
import casaRural1 from "@/assets/casa-rural-1.jpg";

const messages = [
  {
    type: "user",
    text: "Hola! Busco una casa rural con encanto en Toledo para el fin de semana",
    delay: 0,
  },
  {
    type: "bot",
    text: "¡Hola! 🏡 Tengo opciones perfectas para ti en Toledo. ¿Prefieres algo cerca de la ciudad o más aislado en la naturaleza?",
    delay: 1500,
  },
  {
    type: "user",
    text: "Algo tranquilo, rodeado de naturaleza, para desconectar",
    delay: 3500,
  },
  {
    type: "bot",
    text: "¡Perfecto! Te recomiendo esta joya escondida en los Montes de Toledo:",
    delay: 5000,
    image: casaRural1,
    imageAlt: "Casa rural en Toledo",
  },
];

const TypingIndicator = () => (
  <div className="flex gap-1.5 px-4 py-3">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-muted-foreground/50 rounded-full typing-dot"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

export const ChatMockup = () => {
  const [visibleMessages, setVisibleMessages] = useState<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTypingIndex, setCurrentTypingIndex] = useState(0);

  useEffect(() => {
    const showMessage = (index: number) => {
      if (index >= messages.length) return;

      const message = messages[index];
      
      if (message.type === "bot") {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          setVisibleMessages((prev) => [...prev, index]);
          setCurrentTypingIndex(index + 1);
          setTimeout(() => showMessage(index + 1), 1500);
        }, 1200);
      } else {
        setVisibleMessages((prev) => [...prev, index]);
        setCurrentTypingIndex(index + 1);
        setTimeout(() => showMessage(index + 1), 1500);
      }
    };

    const timer = setTimeout(() => showMessage(0), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="glass-card max-w-md mx-auto float"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="relative">
          <img src={logoIcon} alt="viajaCLM" className="w-10 h-10 rounded-xl" />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">viajaCLM</h3>
          <p className="text-xs text-muted-foreground">Siempre disponible</p>
        </div>
      </div>

      {/* Messages */}
      <div className="p-4 space-y-4 h-[340px] overflow-hidden">
        <AnimatePresence mode="popLayout">
          {visibleMessages.map((msgIndex) => {
            const msg = messages[msgIndex];
            const isBot = msg.type === "bot";

            return (
              <motion.div
                key={msgIndex}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex ${isBot ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    isBot
                      ? "bg-muted text-foreground rounded-bl-md"
                      : "bg-primary text-primary-foreground rounded-br-md"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  {msg.image && (
                    <motion.img
                      src={msg.image}
                      alt={msg.imageAlt}
                      className="mt-3 rounded-xl w-full h-32 object-cover"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                    />
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="bg-muted rounded-2xl rounded-bl-md">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
          <input
            type="text"
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
            disabled
          />
          <button className="p-2 bg-primary rounded-full text-primary-foreground">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
};
