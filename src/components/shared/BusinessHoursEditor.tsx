'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Clock, Copy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export type DayHoursData = {
    day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
    open_time: string | null;
    close_time: string | null;
    is_closed: boolean;
};

const DAYS_OF_WEEK = [
    { index: 1, name: 'Lundi' },
    { index: 2, name: 'Mardi' },
    { index: 3, name: 'Mercredi' },
    { index: 4, name: 'Jeudi' },
    { index: 5, name: 'Vendredi' },
    { index: 6, name: 'Samedi' },
    { index: 0, name: 'Dimanche' },
];

const DEFAULT_HOURS: DayHoursData[] = DAYS_OF_WEEK.map(day => ({
    day_of_week: day.index,
    open_time: day.index >= 1 && day.index <= 5 ? '09:00' : null,
    close_time: day.index >= 1 && day.index <= 5 ? '18:00' : null,
    is_closed: day.index === 0 || day.index === 6, // Closed on weekends by default
}));

interface BusinessHoursEditorProps {
    businessId: string;
    initialHours?: DayHoursData[];
    onSave: (hours: DayHoursData[]) => Promise<void>;
    isSaving?: boolean;
}

export function BusinessHoursEditor({
    businessId,
    initialHours,
    onSave,
    isSaving = false
}: BusinessHoursEditorProps) {
    const [hours, setHours] = useState<DayHoursData[]>(DEFAULT_HOURS);
    const [hasChanges, setHasChanges] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (initialHours && initialHours.length > 0) {
            // Merge initial hours with defaults
            const mergedHours = DAYS_OF_WEEK.map(day => {
                const existing = initialHours.find(h => h.day_of_week === day.index);
                if (existing) {
                    return {
                        day_of_week: day.index,
                        open_time: existing.open_time,
                        close_time: existing.close_time,
                        is_closed: existing.is_closed,
                    };
                }
                return DEFAULT_HOURS.find(d => d.day_of_week === day.index)!;
            });
            setHours(mergedHours);
        }
    }, [initialHours]);

    const updateHours = (dayIndex: number, field: keyof DayHoursData, value: any) => {
        setHours(prev => prev.map(h =>
            h.day_of_week === dayIndex ? { ...h, [field]: value } : h
        ));
        setHasChanges(true);
    };

    const toggleDayClosed = (dayIndex: number, closed: boolean) => {
        setHours(prev => prev.map(h =>
            h.day_of_week === dayIndex
                ? {
                    ...h,
                    is_closed: closed,
                    open_time: closed ? null : '09:00',
                    close_time: closed ? null : '18:00'
                }
                : h
        ));
        setHasChanges(true);
    };

    const copyToAllWeekdays = () => {
        const mondayHours = hours.find(h => h.day_of_week === 1);
        if (!mondayHours) return;

        setHours(prev => prev.map(h => {
            // Copy Monday hours to Tuesday-Friday (2-5)
            if (h.day_of_week >= 2 && h.day_of_week <= 5) {
                return {
                    ...h,
                    open_time: mondayHours.open_time,
                    close_time: mondayHours.close_time,
                    is_closed: mondayHours.is_closed,
                };
            }
            return h;
        }));
        setHasChanges(true);
        toast({ title: 'Horaires copiés', description: 'Les horaires du lundi ont été appliqués aux jours ouvrables.' });
    };

    const handleSave = async () => {
        try {
            await onSave(hours);
            setHasChanges(false);
            toast({ title: 'Succès', description: 'Horaires enregistrés avec succès.' });
        } catch (error: any) {
            toast({ title: 'Erreur', description: error.message || 'Impossible d\'enregistrer les horaires.', variant: 'destructive' });
        }
    };

    const getDayName = (dayIndex: number) => {
        return DAYS_OF_WEEK.find(d => d.index === dayIndex)?.name || 'Jour';
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Horaires d'ouverture
                        </CardTitle>
                        <CardDescription>
                            Définissez vos horaires d'ouverture pour chaque jour de la semaine.
                        </CardDescription>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyToAllWeekdays}
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Copier lundi → semaine
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {DAYS_OF_WEEK.map(day => {
                    const dayHours = hours.find(h => h.day_of_week === day.index);
                    if (!dayHours) return null;

                    return (
                        <div
                            key={day.index}
                            className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 rounded-lg border transition-colors ${dayHours.is_closed ? 'bg-muted/50' : 'bg-card'
                                }`}
                        >
                            <div className="w-full sm:w-24 font-medium text-sm">
                                {day.name}
                            </div>

                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={!dayHours.is_closed}
                                    onCheckedChange={(checked) => toggleDayClosed(day.index, !checked)}
                                />
                                <span className={`text-sm ${dayHours.is_closed ? 'text-muted-foreground' : 'text-foreground'}`}>
                                    {dayHours.is_closed ? 'Fermé' : 'Ouvert'}
                                </span>
                            </div>

                            {!dayHours.is_closed && (
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 w-full">
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Label htmlFor={`open-${day.index}`} className="text-xs text-muted-foreground">
                                            De
                                        </Label>
                                        <Input
                                            id={`open-${day.index}`}
                                            type="time"
                                            value={dayHours.open_time || '09:00'}
                                            onChange={(e) => updateHours(day.index, 'open_time', e.target.value)}
                                            className="w-full sm:w-28 h-8 text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Label htmlFor={`close-${day.index}`} className="text-xs text-muted-foreground">
                                            À
                                        </Label>
                                        <Input
                                            id={`close-${day.index}`}
                                            type="time"
                                            value={dayHours.close_time || '18:00'}
                                            onChange={(e) => updateHours(day.index, 'close_time', e.target.value)}
                                            className="w-full sm:w-28 h-8 text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <div className="flex justify-end pt-4 border-t">
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!hasChanges || isSaving}
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Enregistrer les horaires
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
