import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { MapPin, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

type BusinessMapProps = {
    location: string;
    businessName: string;
};

export function BusinessMap({ location, businessName }: BusinessMapProps) {
    // In a real app, you would use a real map provider ID or lat/lng.
    // Here we construct a Google Maps search URL.
    const mapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${businessName} ${location}`
    )}`;

    // Direct directions URL
    const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${businessName} ${location}`
    )}`;

    return (
        <Card className="overflow-hidden border-none shadow-lg ring-1 ring-black/5">
            <div className="relative h-56 w-full group">
                <Image
                    src="/map-morocco.png"
                    alt="Carte interactive du Maroc"
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105 opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 transition-opacity" />

                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                    <Button asChild size="sm" className="w-full max-w-[180px] shadow-xl bg-white text-black hover:bg-white/90 font-semibold transform hover:-translate-y-1 transition-all">
                        <a href={mapSearchUrl} target="_blank" rel="noopener noreferrer">
                            <MapPin className="mr-2 h-4 w-4 text-red-500" />
                            Voir sur la carte
                        </a>
                    </Button>
                    <Button asChild size="sm" className="w-full max-w-[180px] shadow-xl bg-blue-600 text-white hover:bg-blue-700 font-semibold transform hover:-translate-y-1 transition-all">
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Itinéraire
                        </a>
                    </Button>
                </div>
            </div>
            <div className="bg-card p-3 border-t text-sm flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-foreground/90 dark:text-white leading-snug">{location}</span>
            </div>
        </Card>
    );
}
