import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useJsApiLoader, Libraries } from "@react-google-maps/api";
import { supabase } from "@/integrations/supabase/client";

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  apiKey: string | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
  apiKey: null,
});

const libraries: Libraries = ["places"];

// Inner component that loads Google Maps only when API key is available
const GoogleMapsLoaderInner = ({ 
  apiKey, 
  children 
}: { 
  apiKey: string; 
  children: ReactNode;
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
    preventGoogleFontsLoading: true,
  });

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError, apiKey }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const GoogleMapsProvider = ({ children }: { children: ReactNode }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(true);

  // Fetch API key from edge function
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-google-maps-key");
        if (error) throw error;
        if (data?.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (err) {
        console.error("Failed to fetch Google Maps API key:", err);
      } finally {
        setLoadingKey(false);
      }
    };
    fetchApiKey();
  }, []);

  // If still loading or no API key, provide a default context
  if (loadingKey || !apiKey) {
    return (
      <GoogleMapsContext.Provider value={{ isLoaded: false, loadError: undefined, apiKey: null }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  // Once we have the API key, use the inner loader
  return (
    <GoogleMapsLoaderInner apiKey={apiKey}>
      {children}
    </GoogleMapsLoaderInner>
  );
};

export const useGoogleMaps = () => {
  return useContext(GoogleMapsContext);
};
