'use client';

import { useBranding } from '@/hooks/useBranding';
import { Phone } from 'lucide-react';
import Image from 'next/image';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}

export function BrandLogo({ 
  size = 'md', 
  showText = true, 
  className = '',
  iconClassName = '',
  textClassName = ''
}: BrandLogoProps) {
  const { company } = useBranding();

  const sizeClasses = {
    sm: { icon: 'w-6 h-6', text: 'text-sm', container: 'space-x-2' },
    md: { icon: 'w-8 h-8', text: 'text-base', container: 'space-x-3' },
    lg: { icon: 'w-10 h-10', text: 'text-lg', container: 'space-x-3' },
    xl: { icon: 'w-12 h-12', text: 'text-xl', container: 'space-x-4' },
  };

  const currentSize = sizeClasses[size];

  return (
    <div className={`flex items-center ${currentSize.container} ${className}`}>
      {/* Logo/Icon */}
      <div className={`${currentSize.icon} rounded-lg overflow-hidden flex items-center justify-center bg-primary ${iconClassName}`}>
        {company.logoUrl ? (
          <Image 
            src={company.logoUrl} 
            alt={company.logoAltText}
            width={parseInt(currentSize.icon.split('w-')[1]?.split(' ')[0] || '32') * 4}
            height={parseInt(currentSize.icon.split('h-')[1] || '32') * 4}
            className="w-full h-full object-contain"
          />
        ) : (
          <Phone className={`${size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-6 w-6'} text-primary-foreground`} />
        )}
      </div>

      {/* Company Name */}
      {showText && (
        <div>
          <h1 className={`font-bold text-foreground ${currentSize.text} ${textClassName}`}>
            {company.name}
          </h1>
          {size === 'lg' || size === 'xl' ? (
            <p className="text-xs text-muted-foreground">
              {company.slogan}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Convenience components for common use cases
export function BrandLogoSm(props: Omit<BrandLogoProps, 'size'>) {
  return <BrandLogo {...props} size="sm" />;
}

export function BrandLogoMd(props: Omit<BrandLogoProps, 'size'>) {
  return <BrandLogo {...props} size="md" />;
}

export function BrandLogoLg(props: Omit<BrandLogoProps, 'size'>) {
  return <BrandLogo {...props} size="lg" />;
}

export function BrandLogoXl(props: Omit<BrandLogoProps, 'size'>) {
  return <BrandLogo {...props} size="xl" />;
} 