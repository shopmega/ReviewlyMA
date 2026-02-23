'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { getSiteSettings } from '@/lib/data';
import { Bookmark, Pencil, Share2, Phone, Globe, Facebook, Twitter, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import copy from 'copy-to-clipboard';
import { trackBusinessEvent } from '@/app/actions/analytics';
import { ContactDialog } from './ContactDialog';
import { toggleBookmark, getIsBookmarked } from '@/app/actions/user';
import { cn } from '@/lib/utils';
import { useI18n } from '@/components/providers/i18n-provider';

type BusinessActionsProps = {
  businessId: string;
  businessName: string;
  phone?: string;
  website?: string;
};

export function BusinessActions({ businessId, businessName, phone, website }: BusinessActionsProps) {
  const { toast } = useToast();
  const { t, tf } = useI18n();
  const [siteName, setSiteName] = useState('Platform');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadingBookmark, setLoadingBookmark] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [enableReviews, setEnableReviews] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [settings, bookmarked] = await Promise.all([
          getSiteSettings(),
          getIsBookmarked(businessId),
        ]);
        setSiteName(settings.site_name || 'Platform');
        setIsBookmarked(bookmarked);
        setEnableReviews(settings.enable_reviews !== false);
      } catch (error) {
        console.error('Error fetching settings/bookmark:', error);
      }
    };
    init();
  }, [businessId]);

  const handleShare = async () => {
    setShowShareOptions(!showShareOptions);
  };

  const shareVia = (platform: 'facebook' | 'twitter' | 'whatsapp' | 'copy') => {
    const url = window.location.href;
    const text = tf('businessActions.shareText', 'Decouvrez {businessName} sur {siteName}', {
      businessName,
      siteName,
    });

    let shareUrl = '';
    if (platform === 'facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    } else if (platform === 'whatsapp') {
      shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    } else if (platform === 'copy') {
      copy(url);
      toast({
        title: t('businessActions.copyTitle', 'Lien copie !'),
        description: t('businessActions.copyDesc', "L'URL a ete copiee dans votre presse-papiers."),
      });
      return;
    }

    if (shareUrl) window.open(shareUrl, '_blank', 'noopener,noreferrer');
    setShowShareOptions(false);
  };

  const handleSave = async () => {
    setLoadingBookmark(true);
    try {
      const result = await toggleBookmark(businessId);
      if (result.status === 'success') {
        const isNowBookmarked = result.data?.isBookmarked ?? false;
        setIsBookmarked(isNowBookmarked);
        toast({
          title: isNowBookmarked
            ? t('businessActions.savedTitle', 'Enregistre !')
            : t('businessActions.removedTitle', 'Retire'),
          description: isNowBookmarked
            ? t('businessActions.savedDesc', "L'entreprise a ete ajoutee a vos favoris.")
            : t('businessActions.removedDesc', "L'entreprise a ete retiree de vos favoris."),
        });
      } else {
        toast({
          title: t('common.error', 'Erreur'),
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (_error) {
      toast({
        title: t('common.error', 'Erreur'),
        description: t('businessActions.saveError', "Une erreur est survenue lors de l'enregistrement."),
        variant: 'destructive',
      });
    } finally {
      setLoadingBookmark(false);
    }
  };

  const handleCall = () => {
    if (phone) {
      trackBusinessEvent(businessId, 'phone_click');
      window.location.href = `tel:${phone}`;
    }
  };

  const handleWebsite = () => {
    if (website) {
      trackBusinessEvent(businessId, 'website_click');
      window.open(website, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="flex-shrink-0 w-full md:w-auto flex flex-col space-y-2">
      {enableReviews && (
        <div className="flex gap-2">
          <Button asChild size="lg" className="w-full flex-1">
            <Link href={`/businesses/${businessId}/review`}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('businessActions.writeReview', 'Ecrire un avis')}
            </Link>
          </Button>
        </div>
      )}

      {(phone || website) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {phone && (
            <Button variant="default" className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleCall}>
              <Phone className="mr-2 h-4 w-4" />
              {t('businessActions.call', 'Appeler')}
            </Button>
          )}
          {website && (
            <Button variant="outline" className="w-full bg-card/80 backdrop-blur-sm" onClick={handleWebsite}>
              <Globe className="mr-2 h-4 w-4" />
              {t('businessActions.website', 'Site web')}
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
        <Button
          variant="outline"
          className={cn('w-full bg-card/80 backdrop-blur-sm', showShareOptions && 'bg-accent')}
          onClick={handleShare}
        >
          <Share2 className="mr-2 h-4 w-4" />
          {t('businessActions.share', 'Partager')}
        </Button>
        <ContactDialog businessId={businessId} businessName={businessName} />

        {showShareOptions && (
          <div className="absolute bottom-full left-0 mb-2 w-full bg-popover border rounded-lg shadow-xl p-2 z-50 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-4 gap-2">
              <Button size="icon" variant="ghost" onClick={() => shareVia('whatsapp')} className="text-green-600 hover:bg-green-50">
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => shareVia('facebook')} className="text-blue-600 hover:bg-blue-50">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => shareVia('twitter')} className="text-sky-500 hover:bg-sky-50">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => shareVia('copy')} title={t('businessActions.copyLink', 'Copier le lien')}>
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
      <Button
        variant="outline"
        className={cn('w-full bg-card/80 backdrop-blur-sm transition-colors', isBookmarked && 'text-primary border-primary bg-primary/5')}
        onClick={handleSave}
        disabled={loadingBookmark}
      >
        <Bookmark className={cn('mr-2 h-4 w-4', isBookmarked && 'fill-current')} />
        {isBookmarked
          ? t('businessActions.saved', 'Enregistre')
          : t('businessActions.save', 'Enregistrer')}
      </Button>
    </div>
  );
}
