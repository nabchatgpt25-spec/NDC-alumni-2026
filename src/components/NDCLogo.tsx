import React from 'react';
import { useSiteSettings } from '../hooks/useSiteSettings';

interface NDCLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
  useImgTag?: boolean;
}

/**
 * Authentic Notre Dame College (NDC Dhaka) Crest Logo Component
 * Renders the official emblem dynamically configurable via Admin Hub
 * with pixel-perfect vector/image fidelity across all device displays.
 */
export const NDCLogo: React.FC<NDCLogoProps> = ({
  className = 'w-10 h-10',
  alt,
}) => {
  const { settings } = useSiteSettings();
  const logoSrc = settings.branding.logoUrl || '/ndc-logo.svg';
  const logoAlt = alt || settings.branding.logoAlt || 'Notre Dame College Logo';

  return (
    <img
      src={logoSrc}
      alt={logoAlt}
      className={`${className} object-contain shrink-0 select-none`}
      loading="eager"
      decoding="async"
      onError={(e) => {
        // Fallback to official SVG if custom URL fails to load
        const target = e.currentTarget;
        if (target.src !== window.location.origin + '/ndc-logo.svg') {
          target.src = '/ndc-logo.svg';
        }
      }}
    />
  );
};
