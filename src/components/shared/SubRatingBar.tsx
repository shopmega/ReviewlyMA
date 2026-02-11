'use client';

import { Progress } from "@/components/ui/progress";

type SubRatingBarProps = {
    label: string;
    rating: number;
};

export function SubRatingBar({ label, rating }: SubRatingBarProps) {
    const percentage = (rating / 5) * 100;
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-sm">
                <p className="text-muted-foreground">{label}</p>
                <p className="font-semibold">{rating.toFixed(1)}</p>
            </div>
            <Progress value={percentage} className="h-2 [&>div]:bg-accent" />
        </div>
    );
}
