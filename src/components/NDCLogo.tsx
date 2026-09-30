import React from 'react';

interface NDCLogoProps {
  className?: string;
  size?: number | string;
  alt?: string;
  useImgTag?: boolean;
}

/**
 * Authentic Notre Dame College (NDC Dhaka) Crest Logo Component
 * Renders the official emblem directly from /ndc-logo.svg with pixel-perfect
 * vector fidelity across all device displays.
 */
export const NDCLogo: React.FC<NDCLogoProps> = ({
  className = 'w-10 h-10',
  alt = 'Notre Dame College Logo',
}) => {
  return (
    <img
      src="/ndc-logo.svg"
      alt={alt}
      className={`${className} object-contain shrink-0 select-none`}
      loading="eager"
      decoding="async"
    />
  );
};


