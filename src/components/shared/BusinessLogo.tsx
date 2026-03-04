'use client';

import * as React from 'react';
import Image from 'next/image';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { isValidImageUrl } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';

type BusinessLogoProps = {
  logo?: {
    imageUrl?: string;
    imageHint?: string;
  };
  businessName?: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
};

export function BusinessLogo({
  logo,
  businessName,
  width = 40,
  height = 40,
  className = "rounded-lg border-2 border-white/90 bg-white shadow-md overflow-hidden",
  priority = false
}: BusinessLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Reset error state if url changes
  useEffect(() => {
    setImageError(false);
  }, [logo?.imageUrl]);

  // Generate initials from business name
  const getInitials = (name?: string) => {
    if (!name) return 'B';
    const cleanName = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    if (!cleanName) return 'B';

    const words = cleanName.split(/\s+/);
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase();
    }
    // Take first letter of up to 2 words max for Logo (smaller space)
    return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  };

  // Generate background color based on business name for consistent colors
  const getBackgroundColor = (name?: string) => {
    if (!name) return 'bg-slate-100 text-slate-600';

    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const colors = [
      'from-blue-500 to-blue-600 text-white',
      'from-emerald-500 to-emerald-600 text-white',
      'from-sky-500 to-sky-600 text-white',
      'from-amber-500 to-amber-600 text-white',
      'from-rose-500 to-rose-600 text-white',
      'from-cyan-500 to-cyan-600 text-white',
      'from-teal-500 to-teal-600 text-white',
      'from-indigo-500 to-indigo-600 text-white',
    ];

    return `bg-gradient-to-br ${colors[Math.abs(hash) % colors.length]}`;
  };

  const initials = getInitials(businessName);
  const bgColor = getBackgroundColor(businessName);

  // Check valid URL
  const hasValidUrl = logo?.imageUrl && isValidImageUrl(logo.imageUrl);

  if (!hasValidUrl || imageError) {
    return (
      <div
        className={`flex items-center justify-center ${bgColor} ${className} relative overflow-hidden`}
        style={{ width, height }}
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,white,transparent_55%)]" />
        <div className="relative z-10 flex flex-col items-center justify-center leading-none">
          <Building2 className="h-3.5 w-3.5 mb-1 opacity-90" />
          <span className="font-black tracking-tight" style={{ fontSize: Math.max(10, Math.round(width * 0.28)) }}>
            {initials}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <Image
        src={logo!.imageUrl!}
        alt={`${businessName || 'Business'} logo`}
        fill
        className="object-cover"
        onError={() => setImageError(true)}
        sizes={`${width}px`}
        priority={priority}
      />
    </div>
  );
}
