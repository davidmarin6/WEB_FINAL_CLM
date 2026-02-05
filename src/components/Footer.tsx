import { motion } from "framer-motion";
import logoHorizontal from "@/assets/logo-viajaclm.png";

export const Footer = () => {
  return (
    <footer className="bg-foreground text-primary-foreground py-16">
      <div className="container px-4 md:px-6">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <img
              src={logoHorizontal}
              alt="viajaCLM"
              className="h-12 mb-4 brightness-0 invert opacity-90"
            />
            <p className="text-primary-foreground/70 max-w-sm mb-6">
              Tu asistente inteligente para descubrir los mejores alojamientos rurales
              de Castilla-La Mancha. Tecnología al servicio del turismo rural.
            </p>
            <div className="flex gap-4">
              {["twitter", "instagram", "facebook"].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                >
                  <span className="sr-only">{social}</span>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="4" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Explorar</h4>
            <ul className="space-y-2 text-primary-foreground/70">
              {["Toledo", "Cuenca", "Ciudad Real", "Albacete", "Guadalajara"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary-foreground transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-primary-foreground/70">
              {["Términos de uso", "Privacidad", "Cookies", "Contacto"].map((item) => (
                <li key={item}>
                  <a href="#" className="hover:text-primary-foreground transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/50 text-sm">
            © 2026 viajaCLM. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-2 text-primary-foreground/50 text-sm">
            <span>Hecho con</span>
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ❤️
            </motion.span>
            <span>en Castilla-La Mancha</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
