import React from 'react';
import { ThemeToggle } from './ThemeToggle';

interface VisualThemeSelectorProps {
  className?: string;
  showQuickToggle?: boolean;
}

/**
 * VisualThemeSelector is maintained for backwards compatibility,
 * rendering the streamlined Light/Dark theme toggle.
 */
export const VisualThemeSelector: React.FC<VisualThemeSelectorProps> = ({
  className = '',
}) => {
  return <ThemeToggle className={className} />;
};
