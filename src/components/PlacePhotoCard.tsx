import { MapPin, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PlacePhotoCardProps {
  url: string;
  photoUrl?: string;
  placeName?: string;
  loading: boolean;
}

export const PlacePhotoCard = ({ url, photoUrl, placeName, loading }: PlacePhotoCardProps) => {
  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden border border-border my-3">
        <div className="space-y-2">
          <Skeleton className="w-full h-48 md:h-56" />
          <div className="p-3">
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!photoUrl) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-border my-3">
      <div className="relative group">
        <img
          src={photoUrl}
          alt={placeName || "Alojamiento"}
          className="w-full h-48 md:h-56 object-cover hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent opacity-80" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="text-primary-foreground font-semibold text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {placeName || "Ver en Google Maps"}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const topWindow = window.top || window.parent || window;
            topWindow.open(url, "_blank", "noopener,noreferrer");
          }}
          className="absolute top-3 right-3 p-2 bg-background/80 hover:bg-background rounded-full transition-colors opacity-0 group-hover:opacity-100"
        >
          <ExternalLink className="w-4 h-4 text-foreground" />
        </button>
      </div>
    </div>
  );
};
