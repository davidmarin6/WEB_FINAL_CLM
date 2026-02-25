import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Target, Castle, Lightbulb, Star, MapPin, Clock, Heart, Shield } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Recomendaciones personalizadas",
    description: "IA que entiende tus preferencias y te sugiere alojamientos a tu medida.",
  },
  {
    icon: Castle,
    title: "+100 alojamientos rurales",
    description: "La mayor selección de casas rurales en las 5 provincias de Castilla-La Mancha.",
  },
  {
    icon: Clock,
    title: "Disponible 24/7",
    description: "Nuestro asistente nunca duerme. Busca alojamiento cuando quieras, donde quieras.",
  },
  {
    icon: Star,
    title: "Experiencias únicas",
    description: "Desde molinos restaurados hasta casas cueva. Vive algo diferente.",
  },
  {
    icon: MapPin,
    title: "Toda la región",
    description: "Toledo, Cuenca, Ciudad Real, Albacete y Guadalajara. Todo en un solo lugar.",
  },
  {
    icon: Heart,
    title: "Selección cuidada",
    description: "Cada alojamiento verificado para garantizar calidad y autenticidad.",
  },
];

export const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <section ref={ref} className="py-24 md:py-32 bg-card relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="container px-4 md:px-6 relative">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 bg-secondary/10 text-secondary rounded-full text-sm font-medium mb-4">
            Características
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Todo lo que necesitas
          </h2>
          <p className="text-lg text-muted-foreground">
            Tecnología punta al servicio del turismo rural más auténtico
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
              className="feature-card group cursor-pointer"
              whileHover={{
                y: -8,
                transition: { duration: 0.3 }
              }}
            >
              {/* Glow Effect on Hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative">
                {/* Icon */}
                <motion.div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 text-primary mb-5"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <feature.icon className="w-7 h-7" />
                </motion.div>

                {/* Content */}
                <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
