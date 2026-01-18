import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { FeaturesSection } from "@/components/FeaturesSection";
import { GallerySection } from "@/components/GallerySection";
import { CTASection } from "@/components/CTASection";
import { Footer } from "@/components/Footer";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { ChatModal } from "@/components/ChatModal";
import { ChatProvider, useChat } from "@/contexts/ChatContext";

const IndexContent = () => {
  const { isOpen, closeChat } = useChat();

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
      <ChatModal isOpen={isOpen} onClose={closeChat} />
    </div>
  );
};

const Index = () => {
  return (
    <ChatProvider>
      <IndexContent />
    </ChatProvider>
  );
};

export default Index;
