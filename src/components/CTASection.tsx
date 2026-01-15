import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import heroLandscape from "@/assets/hero-landscape.jpg";

export const CTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [count, setCount] = useState(0);
  const targetCount = 1247;

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = targetCount / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= targetCount) {
          setCount(targetCount);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView]);

  return (
    <section ref={ref} className="relative py-32 md:py-48 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroLandscape}
          alt="Paisaje de Castilla-La Mancha"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/50 to-foreground/30" />
      </div>

      {/* Floating Elements */}
      <motion.div
        className="absolute top-1/4 left-10 w-20 h-20 rounded-full bg-primary/20 blur-2xl"
        animate={{ y: [0, -20, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-1/4 right-10 w-32 h-32 rounded-full bg-secondary/20 blur-2xl"
        animate={{ y: [0, 20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, delay: 1 }}
      />

      <div className="container relative z-10 px-4 md:px-6 text-center">
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          {/* Counter */}
          <motion.div
            className="mb-8"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-primary-foreground/10 backdrop-blur-md rounded-full border border-primary-foreground/20">
              <span className="text-4xl md:text-5xl font-bold text-primary-foreground counter">
                {count.toLocaleString()}
              </span>
              <span className="text-primary-foreground/80 text-lg">
                alojamientos disponibles
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            Empieza a explorar{" "}
            <span className="gradient-text">Castilla-La Mancha</span>{" "}
            hoy
          </motion.h2>

          <motion.p
            className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Tu próxima aventura rural está a una conversación de distancia. 
            Déjate guiar por nuestro asistente inteligente.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <button className="btn-hero text-xl px-12 py-5 pulse-glow">
              <span>Comenzar ahora</span>
              <motion.span
                className="ml-3 inline-block"
                animate={{ x: [0, 8, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            className="mt-12 flex flex-wrap justify-center gap-6"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            {["Sin registro requerido", "100% gratuito", "Respuesta inmediata"].map((badge, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-primary-foreground/70"
              >
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">{badge}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
