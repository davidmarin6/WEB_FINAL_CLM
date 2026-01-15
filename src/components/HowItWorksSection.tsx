import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { MessageCircle, Bot, Home } from "lucide-react";

const steps = [
  {
    icon: MessageCircle,
    title: "Cuéntanos tus preferencias",
    description: "Conversa naturalmente con nuestro chatbot. Dile qué buscas: ubicación, fechas, ambiente, servicios...",
    color: "primary",
  },
  {
    icon: Bot,
    title: "IA busca tu alojamiento ideal",
    description: "Nuestro asistente analiza +1.000 opciones y encuentra las que mejor se adaptan a ti.",
    color: "secondary",
  },
  {
    icon: Home,
    title: "Reserva y disfruta",
    description: "Elige entre las recomendaciones personalizadas y vive una experiencia rural única.",
    color: "accent",
  },
];

export const HowItWorksSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-24 md:py-32 section-gradient relative overflow-hidden">
      {/* Decorative Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="container px-4 md:px-6 relative">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            Así de fácil
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            ¿Cómo funciona?
          </h2>
          <p className="text-lg text-muted-foreground">
            Tres simples pasos para encontrar tu escapada perfecta en Castilla-La Mancha
          </p>
        </motion.div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5">
            <motion.div
              className="h-full bg-gradient-to-r from-primary via-secondary to-accent"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.5, ease: "easeInOut" }}
              style={{ transformOrigin: "left" }}
            />
          </div>

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 + index * 0.2 }}
              className="relative"
            >
              <div className="glass-card p-8 text-center group hover:scale-105 transition-transform duration-500">
                {/* Step Number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-bold">
                    {index + 1}
                  </span>
                </div>

                {/* Icon */}
                <motion.div
                  className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 ${
                    step.color === "primary"
                      ? "bg-primary/10 text-primary"
                      : step.color === "secondary"
                      ? "bg-secondary/10 text-secondary"
                      : "bg-accent/10 text-accent"
                  }`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <step.icon className="w-10 h-10" />
                </motion.div>

                {/* Content */}
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
