'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pin, PinOff, Eye, EyeOff } from 'lucide-react';
import { PinnedContent } from '@/lib/types';
import { togglePinnedContentStatus } from '@/lib/pinned-content/server-actions';
import { useToast } from '@/hooks/use-toast';

interface PinnedContentProps {
  content: PinnedContent;
  showControls?: boolean; // Whether to show admin controls
  onStatusChange?: () => void; // Callback when status changes
}

const PinnedContentComponent: React.FC<PinnedContentProps> = ({ 
  content, 
  showControls = false,
  onStatusChange
}) => {
  const { toast } = useToast();

  const handleToggleStatus = async () => {
    const result = await togglePinnedContentStatus(content.id);
    if (result.success) {
      toast({
        title: 'Succès',
        description: `Contenu ${content.is_active ? 'désactivé' : 'activé'} avec succès`,
      });
      if (onStatusChange) {
        onStatusChange();
      }
    } else {
      toast({
        title: 'Erreur',
        description: result.error || 'Impossible de modifier le statut du contenu',
        variant: 'destructive',
      });
    }
  };

  if (!content.is_active) {
    return null;
  }

  return (
    <Card className="border-2 border-blue-200 bg-blue-50">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Pin className="h-4 w-4 text-blue-600" />
                {content.title}
              </CardTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                Contenu Épinglé
              </Badge>
            </div>
          </div>
          
          {showControls && (
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleToggleStatus}
                className="h-8 w-8 p-0"
              >
                {content.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700">{content.content}</p>
        
        {content.media_urls && content.media_urls.length > 0 && (
          <div className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {content.media_urls.map((url, index) => (
                <div key={index} className="aspect-square rounded-md overflow-hidden">
                  <img 
                    src={url} 
                    alt={`Contenu média ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PinnedContentComponent;