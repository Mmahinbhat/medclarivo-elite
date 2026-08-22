(function () {
  const LIGHT = '#F5F7FA';
  const DARK  = '#0D1117';

  function applyNativeThemeBackground(theme) {
    const color = theme === 'dark' ? DARK : LIGHT;
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ThemeBackground) {
      window.Capacitor.Plugins.ThemeBackground.setBackground({ color: color }).catch(() => {});
    }
  }

  window.applyNativeThemeBackground = applyNativeThemeBackground;

  // Set immediately on load, from whatever theme is already saved.
  const saved = localStorage.getItem('mc_theme') === 'dark' ? 'dark' : 'light';
  applyNativeThemeBackground(saved);
})();
