'use client';

import { useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleFavorite } from '@/app/actions/favorites';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { SoftAuthDialog } from '@/components/auth/SoftAuthDialog';
import { useI18n } from '@/components/providers/i18n-provider';

interface FollowButtonProps {
    businessId: string;
    initialIsFollowing: boolean;
    className?: string;
}

export function FollowButton({ businessId, initialIsFollowing, className }: FollowButtonProps) {
    const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
    const [isPending, startTransition] = useTransition();
    const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
    const pathname = usePathname();
    const { toast } = useToast();
    const { t } = useI18n();
    const supabase = createClient();

    const handleToggle = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setIsAuthPromptOpen(true);
            return;
        }

        const nextState = !isFollowing;
        setIsFollowing(nextState);

        startTransition(async () => {
            const result = await toggleFavorite(businessId, pathname);
            if (result.status === 'error') {
                setIsFollowing(!nextState);
                toast({ title: t('common.error', 'Erreur'), description: result.message, variant: 'destructive' });
                return;
            }

            toast({
                title: nextState ? t('follow.followedTitle', 'Abonne') : t('follow.unfollowedTitle', 'Desabonne'),
                description: nextState
                    ? t('follow.followedDescription', 'Vous recevrez les nouveautes de cette entreprise.')
                    : t('follow.unfollowedDescription', 'Vous ne recevrez plus les nouveautes.'),
            });
        });
    };

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                onClick={handleToggle}
                disabled={isPending}
                className={cn(
                    'gap-2 transition-all',
                    isFollowing
                        ? 'text-red-500 hover:text-red-600 border-red-200 bg-red-50 hover:bg-red-100'
                        : 'hover:bg-accent hover:text-accent-foreground',
                    className
                )}
            >
                <Heart className={cn('h-5 w-5', isFollowing && 'fill-current')} />
                <span className={cn(className?.includes('w-11') || className?.includes('p-0') ? 'sr-only' : 'hidden sm:inline')}>
                    {isFollowing ? t('follow.active', 'Suivi') : t('follow.cta', 'Suivre')}
                </span>
            </Button>
            <SoftAuthDialog
                open={isAuthPromptOpen}
                onOpenChange={setIsAuthPromptOpen}
                nextPath={pathname || `/businesses/${businessId}`}
                intent="follow_business"
                title={t('follow.promptTitle', 'Suivez les entreprises qui vous interessent')}
                description={t('follow.promptDescription', 'Connectez-vous pour enregistrer vos entreprises preferees et recevoir leurs mises a jour.')}
            />
        </>
    );
}
