'use client';

import { Update } from '@/lib/types';
import { Newspaper, Pin } from 'lucide-react';
import { useI18n } from '@/components/providers/i18n-provider';

interface UpdatesSectionProps {
  updates: Update[];
}

export function UpdatesSection({ updates }: UpdatesSectionProps) {
  const { t } = useI18n();

  if (!updates || updates.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold font-headline mb-4">{t('updates.title', 'Actualites')}</h2>
      {updates.slice(0, 3).map((update) => (
        <section key={update.id} className="glass-card rounded-2xl p-6 border border-border/50 hover:border-primary/30 transition-all hover:shadow-md">
          <div className="flex items-start gap-4">
            <div className="bg-primary/10 p-3 rounded-xl text-primary shrink-0">
              <Newspaper className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-foreground">{update.title}</h3>
                  {update.isPinned && (
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                      <Pin className="mr-1 h-3 w-3" />
                      Epinglee
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-muted-foreground bg-secondary/50 px-2.5 py-1 rounded-md border border-border/50">{update.date}</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{update.text}</p>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
