import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

export const FloatingChatButton = () => {
  return (
    <motion.button
      className="fixed bottom-6 right-6 z-50 group"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Glow Ring */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Button */}
      <div className="relative flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-primary to-accent rounded-full shadow-lg hover:shadow-xl transition-shadow">
        <img src={logoIcon} alt="viajaCLM" className="w-8 h-8 rounded-lg" />
        <span className="text-primary-foreground font-semibold whitespace-nowrap pr-1">
          Probar chatbot
        </span>
      </div>

      {/* Tooltip */}
      <motion.div
        className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-foreground text-background text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
        initial={{ y: 5 }}
        whileHover={{ y: 0 }}
      >
        ¡Prueba el asistente ahora!
        <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-foreground" />
      </motion.div>
    </motion.button>
  );
};
