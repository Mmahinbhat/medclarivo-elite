(function () {
  async function spaNavigate(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) { window.location.href = url; return; }
      const html = await res.text();
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(html, 'text/html');

      document.title = newDoc.title;
      document.body.innerHTML = newDoc.body.innerHTML;

      Array.from(document.body.querySelectorAll('script')).forEach(oldScript => {
        if (oldScript.src) return;
        const newScript = document.createElement('script');
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });

      if (typeof window.mountStudentSidebar === 'function') {
        window.mountStudentSidebar();
      }
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }

      history.pushState({ spaUrl: url }, '', url);
      window.scrollTo(0, 0);
    } catch (e) {
      console.warn('SPA navigate failed, falling back to full reload', e);
      window.location.href = url;
    }
  }

  window.spaNavigate = spaNavigate;

  window.addEventListener('popstate', function (event) {
    const url = (event.state && event.state.spaUrl) || window.location.pathname.split('/').pop();
    spaNavigate(url);
  });
})();
