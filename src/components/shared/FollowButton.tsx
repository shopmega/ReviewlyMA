'use client';

import { useState, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toggleFavorite } from "@/app/actions/favorites";
import { usePathname } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FollowButtonProps {
    businessId: string;
    initialIsFollowing: boolean;
    className?: string;
}

export function FollowButton({ businessId, initialIsFollowing, className }: FollowButtonProps) {
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [isPending, startTransition] = useTransition();
    const pathname = usePathname();
    const { toast } = useToast();

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault(); // Prevent link navigation if inside a card
        e.stopPropagation();

        const newState = !isFollowing;
        setIsFollowing(newState);

        startTransition(async () => {
            const result = await toggleFavorite(businessId, pathname);
            if (result.status === 'error') {
                setIsFollowing(!newState); // Revert
                toast({ title: 'Erreur', description: result.message, variant: 'destructive' });
            } else {
                toast({
                    title: newState ? 'Abonné !' : 'Désabonné',
                    description: newState ? 'Vous recevrez les nouveautés de cette entreprise.' : 'Vous ne recevrez plus les nouveautés.'
                });
            }
        });
    };

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={isPending}
            className={cn(
                "gap-2 transition-all",
                isFollowing
                    ? "text-red-500 hover:text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
                    : "hover:bg-accent hover:text-accent-foreground",
                className
            )}
        >
            <Heart className={cn("h-5 w-5", isFollowing && "fill-current")} />
            <span className={cn(className?.includes('w-11') || className?.includes('p-0') ? "sr-only" : "hidden sm:inline")}>
                {isFollowing ? 'Suivi' : 'Suivre'}
            </span>
        </Button>
    );
}
