'use strict';

const siteMenu = document.getElementById('site-menu');
siteMenu.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || !siteMenu.classList.contains('show')) return;
  const destination = new URL(link.href);
  if (destination.pathname !== location.pathname || destination.search !== location.search) return;
  siteMenu.addEventListener('hidden.bs.collapse', () => {
    if (location.hash !== destination.hash) return;
    const target = document.getElementById(destination.hash.slice(1));
    target?.scrollIntoView({ block: 'start' });
  }, { once: true });
  bootstrap.Collapse.getOrCreateInstance(siteMenu, { toggle: false }).hide();
});
