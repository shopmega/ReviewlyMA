'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Share2, Link as LinkIcon, Facebook, Twitter, Check, MessageSquare } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getClientSiteUrl } from "@/lib/site-config";

interface ShareButtonProps {
    businessId: string;
    businessName: string;
    className?: string;
}

export function ShareButton({ businessId, businessName, className }: ShareButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const shareUrl = `${getClientSiteUrl()}/businesses/${businessId}`;

    const handleShareClick = async () => {
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: businessName,
                    text: `Découvrez ${businessName} !`,
                    url: shareUrl,
                });
            } catch (error) {
                console.log('Error sharing:', error);
            }
        } else {
            setIsOpen(true);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast({
            title: "Lien copié !",
            description: "Le lien a été copié dans votre presse-papiers.",
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSocialShare = (platform: 'facebook' | 'twitter' | 'whatsapp') => {
        let url = '';
        const text = `Découvrez ${businessName} !`;

        switch (platform) {
            case 'facebook':
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
                break;
            case 'twitter':
                url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
                break;
            case 'whatsapp':
                url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
                break;
        }

        if (url) {
            window.open(url, '_blank', 'width=600,height=400');
        }
        setIsOpen(false);
    };

    return (
        <>
            <Button
                size="lg"
                variant="outline"
                className={`rounded-full border-white/50 text-white hover:bg-white/20 bg-black/20 backdrop-blur-md h-12 w-12 p-0 shrink-0 transition-transform hover:scale-105 ${className || ''}`}
                onClick={handleShareClick}
            >
                <Share2 className="h-5 w-5" />
                <span className="sr-only">Partager</span>
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Partager cette entreprise</DialogTitle>
                        <DialogDescription>
                            Envoyez le profil de {businessName} à vos amis.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <div className="flex items-center space-x-2">
                            <div className="grid flex-1 gap-2">
                                <Button variant="outline" className="justify-start gap-2 h-12" onClick={() => handleSocialShare('facebook')}>
                                    <Facebook className="h-5 w-5 text-blue-600" />
                                    Facebook
                                </Button>
                            </div>
                            <div className="grid flex-1 gap-2">
                                <Button variant="outline" className="justify-start gap-2 h-12" onClick={() => handleSocialShare('twitter')}>
                                    <Twitter className="h-5 w-5 text-sky-500" />
                                    Twitter
                                </Button>
                            </div>

                        </div>
                        <div className="grid flex-1 gap-2">
                            <Button variant="outline" className="justify-start gap-2 h-12" onClick={() => handleSocialShare('whatsapp')}>
                                <MessageSquare className="h-5 w-5 text-green-500" />
                                WhatsApp
                            </Button>
                        </div>

                        <div className="relative mt-2">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Ou copier le lien</span>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <div className="grid flex-1 gap-2">
                                <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-muted-foreground truncate">
                                    {shareUrl}
                                </div>
                            </div>
                            <Button type="button" size="icon" onClick={handleCopy} className={copied ? "bg-green-600 hover:bg-green-700" : ""}>
                                {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
