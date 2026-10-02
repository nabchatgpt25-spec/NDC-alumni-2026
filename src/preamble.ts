if (typeof window !== 'undefined') {
  const win = window as unknown as Record<string, unknown>;
  if (!win.$RefreshReg$) {
    win.$RefreshReg$ = () => {};
  }
  if (!win.$RefreshSig$) {
    win.$RefreshSig$ = () => (type: unknown) => type;
  }
  win.__vite_plugin_react_preamble_installed__ = true;

  // Clean up any stale dev service workers on preview/dev hosts
  if (
    'serviceWorker' in navigator &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname.startsWith('ais-dev-'))
  ) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {});
        }
      })
      .catch(() => {});
  }
}
export {};
