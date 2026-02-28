'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/analytics';
import { Check, Copy, Facebook, Linkedin, MessageCircle, Share2, Twitter } from 'lucide-react';

type ShareChannel = 'native' | 'whatsapp' | 'linkedin' | 'facebook' | 'twitter' | 'copy';

type Props = {
  url: string;
  title: string;
  text: string;
  contentType: string;
  contentId: string;
  cardType: string;
  campaign?: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
};

function generateShareId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `share_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function ContentShareButton({
  url,
  title,
  text,
  contentType,
  contentId,
  cardType,
  campaign,
  label = 'Partager',
  iconOnly = false,
  className,
}: Props) {
  const { toast } = useToast();
  const [showOptions, setShowOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareIdRef = useRef<string | null>(null);

  const ensureShareId = () => {
    if (!shareIdRef.current) {
      shareIdRef.current = generateShareId();
    }
    return shareIdRef.current;
  };

  const buildTrackedUrl = (channel: ShareChannel) => {
    const target =
      url.startsWith('http://') || url.startsWith('https://')
        ? new URL(url)
        : new URL(url, window.location.origin);
    const shareId = ensureShareId();

    target.searchParams.set('utm_source', channel);
    target.searchParams.set('utm_medium', 'share');
    target.searchParams.set('utm_campaign', campaign || `${contentType}_share`);
    target.searchParams.set('utm_content', cardType);
    target.searchParams.set('share_id', shareId);
    target.searchParams.set('shared_content_type', contentType);
    target.searchParams.set('shared_content_id', contentId);

    return target.toString();
  };

  const trackInitiated = (channelSuggested: ShareChannel) => {
    const shareId = ensureShareId();
    analytics.track('share_initiated', {
      share_id: shareId,
      content_type: contentType,
      content_id: contentId,
      card_type: cardType,
      channel_suggested: channelSuggested,
      page_path: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
  };

  const trackCompleted = (channel: ShareChannel, trackedUrl: string, method: 'native' | 'window_open' | 'copy') => {
    analytics.track('share_completed', {
      share_id: ensureShareId(),
      channel,
      method,
      content_type: contentType,
      content_id: contentId,
      card_type: cardType,
      tracked_url: trackedUrl,
    });
  };

  const shareViaChannel = async (channel: Exclude<ShareChannel, 'native'>) => {
    const trackedUrl = buildTrackedUrl(channel);

    if (channel === 'copy') {
      await navigator.clipboard.writeText(trackedUrl);
      trackCompleted(channel, trackedUrl, 'copy');
      setCopied(true);
      toast({
        title: 'Lien copie',
        description: 'Le lien de partage a ete copie.',
      });
      setTimeout(() => setCopied(false), 1800);
      return;
    }

    let shareLink = '';
    if (channel === 'whatsapp') {
      shareLink = `https://wa.me/?text=${encodeURIComponent(`${text} ${trackedUrl}`)}`;
    } else if (channel === 'linkedin') {
      shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(trackedUrl)}`;
    } else if (channel === 'facebook') {
      shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(trackedUrl)}`;
    } else if (channel === 'twitter') {
      shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(trackedUrl)}`;
    }

    if (shareLink) {
      window.open(shareLink, '_blank', 'noopener,noreferrer');
      trackCompleted(channel, trackedUrl, 'window_open');
      setShowOptions(false);
    }
  };

  const handlePrimaryShare = async () => {
    trackInitiated('native');

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const trackedUrl = buildTrackedUrl('native');
        await navigator.share({ title, text, url: trackedUrl });
        trackCompleted('native', trackedUrl, 'native');
      } catch (_error) {
        setShowOptions(true);
      }
      return;
    }

    setShowOptions((prev) => !prev);
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={handlePrimaryShare}
      >
        <Share2 className={`h-4 w-4 ${iconOnly ? '' : 'mr-2'}`} />
        {!iconOnly && label}
        {iconOnly && <span className="sr-only">{label}</span>}
      </Button>

      {showOptions && (
        <div className="absolute right-0 top-full mt-2 z-50 rounded-xl border bg-popover p-2 shadow-xl w-[220px]">
          <div className="grid grid-cols-3 gap-2">
            <Button size="icon" variant="ghost" onClick={() => shareViaChannel('whatsapp')} title="WhatsApp">
              <MessageCircle className="h-5 w-5 text-green-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => shareViaChannel('linkedin')} title="LinkedIn">
              <Linkedin className="h-5 w-5 text-blue-700" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => shareViaChannel('facebook')} title="Facebook">
              <Facebook className="h-5 w-5 text-blue-600" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => shareViaChannel('twitter')} title="X / Twitter">
              <Twitter className="h-5 w-5 text-sky-500" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => shareViaChannel('copy')} title="Copier le lien">
              {copied ? <Check className="h-5 w-5 text-emerald-600" /> : <Copy className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
