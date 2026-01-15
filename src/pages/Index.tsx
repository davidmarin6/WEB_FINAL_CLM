import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { GallerySection } from "@/components/GallerySection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { FloatingChatButton } from "@/components/FloatingChatButton";

const Index = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      <main>
        <HeroSection />
        
        <div id="how-it-works">
          <HowItWorksSection />
        </div>
        
        <div id="features">
          <FeaturesSection />
        </div>
        
        <div id="gallery">
          <GallerySection />
        </div>
        
        <CTASection />
      </main>

      <Footer />
      <FloatingChatButton />
    </div>
  );
};

export default Index;
