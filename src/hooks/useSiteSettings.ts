import { useState, useEffect, useCallback } from 'react';
import {
  PortalSiteSettings,
  getSiteSettings,
  saveSiteSettings,
  resetSiteSettingsToDefault,
} from '../services/siteSettingsService';

export function useSiteSettings() {
  const [settings, setSettings] = useState<PortalSiteSettings>(getSiteSettings);

  useEffect(() => {
    const handleSettingsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<PortalSiteSettings>;
      if (customEvent.detail) {
        setSettings(customEvent.detail);
      } else {
        setSettings(getSiteSettings());
      }
    };

    window.addEventListener('ndc_site_settings_updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);

    return () => {
      window.removeEventListener('ndc_site_settings_updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, []);

  const updateSettings = useCallback((newSettings: Partial<PortalSiteSettings>) => {
    const updated = saveSiteSettings(newSettings);
    setSettings(updated);
    return updated;
  }, []);

  const resetSettings = useCallback(() => {
    const def = resetSiteSettingsToDefault();
    setSettings(def);
    return def;
  }, []);

  return {
    settings,
    updateSettings,
    resetSettings,
  };
}
