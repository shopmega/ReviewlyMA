'use client';

import { Business } from '@/lib/types';
import { CheckSquare } from 'lucide-react';
import { getAmenityGroup } from '@/lib/location-discovery';

interface AboutSectionProps {
    business: Business;
}

export function AboutSection({ business }: AboutSectionProps) {
    return (
        <section className="glass-card p-8 rounded-2xl border border-border/50 transition-all hover:shadow-lg">
            <h2 className="text-2xl font-bold font-headline mb-6 text-foreground flex items-center gap-3">
                <div className="w-1 h-8 bg-primary rounded-full" />
                À propos de {business.name}
            </h2>
            <div className="prose max-w-none text-muted-foreground leading-relaxed font-body">
                {business.description}
            </div>

            {/* Amenities - More compact row */}
            {business.amenities && business.amenities.length > 0 && (
                <div className="mt-10 pt-8 border-t border-border/50">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6 flex items-center gap-2">
                        <CheckSquare className="w-4 h-4 text-primary" />
                        Avantages & Prestations
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {business.amenities.map(amenity => {
                            const group = getAmenityGroup(amenity);
                            return (
                                <div key={amenity} className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-card text-foreground text-sm font-semibold border border-border/60 transition-all hover:bg-primary/5 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm">
                                    <span className="text-base">
                                        {group?.icon || '•'}
                                    </span>
                                    {amenity}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </section>
    );
}
