import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import casaRural1 from "@/assets/casa-rural-1.jpg";
import casaRural2 from "@/assets/casa-rural-2.jpg";
import casaRural3 from "@/assets/casa-rural-3.jpg";

const accommodations = [
  {
    image: casaRural1,
    name: "Casa del Molino",
    location: "Consuegra, Toledo",
    price: "desde 85€/noche",
  },
  {
    image: casaRural2,
    name: "El Rincón de las Vigas",
    location: "Cuenca",
    price: "desde 95€/noche",
  },
  {
    image: casaRural3,
    name: "Finca Los Olivos",
    location: "Campo de Criptana",
    price: "desde 120€/noche",
  },
];

export const GallerySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % accommodations.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section ref={ref} className="py-24 md:py-32 section-gradient relative overflow-hidden">
      <div className="container px-4 md:px-6">
        {/* Section Header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-block px-4 py-1.5 bg-accent/10 text-accent rounded-full text-sm font-medium mb-4">
            Galería
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Alojamientos con encanto
          </h2>
          <p className="text-lg text-muted-foreground">
            Descubre algunos de los rincones más especiales que te esperan
          </p>
        </motion.div>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {accommodations.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.15 }}
              className={`relative group cursor-pointer overflow-hidden rounded-2xl ${
                index === activeIndex ? "ring-2 ring-primary ring-offset-4 ring-offset-background" : ""
              }`}
              onClick={() => setActiveIndex(index)}
            >
              {/* Image with Ken Burns Effect */}
              <div className="aspect-[4/3] overflow-hidden">
                <motion.img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-[8000ms] ease-linear group-hover:scale-110"
                />
              </div>

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <h3 className="text-xl font-bold text-primary-foreground mb-1">
                    {item.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-primary-foreground/80 text-sm flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {item.location}
                    </span>
                    <span className="text-primary-foreground font-semibold text-sm">
                      {item.price}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Hover Effect Border */}
              <div className="absolute inset-0 border-4 border-transparent group-hover:border-primary/50 rounded-2xl transition-colors duration-300" />
            </motion.div>
          ))}
        </div>

        {/* Carousel Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {accommodations.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "w-8 bg-primary"
                  : "bg-primary/30 hover:bg-primary/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
