(() => {
  'use strict';

  const PUBLIC_KEY = 'https://disk.yandex.ru/d/BYYUoJXrqOW2ig';
  const LIMIT = 20;
  const API_URL =
    `https://cloud-api.yandex.net/v1/disk/public/resources?public_key=${encodeURIComponent(PUBLIC_KEY)}` +
    `&limit=${LIMIT}&sort=-created&preview_size=L&preview_crop=true`;

  const grid = document.getElementById('galleryGrid');
  const errorBox = document.getElementById('galleryError');
  if (!grid) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Скелетоны, пока грузим. */
  const SKELETON_COUNT = 10;
  for (let i = 0; i < SKELETON_COUNT; i++) {
    const el = document.createElement('div');
    el.className = 'gallery-tile skeleton';
    el.dataset.skeleton = 'true';
    grid.appendChild(el);
  }

  let photos = [];
  let lightboxIndex = -1;

  function clearSkeletons() {
    grid.querySelectorAll('[data-skeleton]').forEach((el) => el.remove());
  }

  function renderTiles(items) {
    clearSkeletons();

    const tileObserver = prefersReducedMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                tileObserver.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.1 }
        );

    items.forEach((item, index) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'gallery-tile';
      tile.setAttribute('aria-label', `Открыть фото ${index + 1} из ${items.length}`);
      if (!prefersReducedMotion) {
        tile.style.transitionDelay = `${Math.min(index, 12) * 60}ms`;
      }

      const img = document.createElement('img');
      img.src = item.preview;
      img.loading = 'lazy';
      img.decoding = 'async';
      // Яндекс.Диск режет hotlink по Referer с чужих доменов (даёт 403) — без него отдаёт нормально.
      img.referrerPolicy = 'no-referrer';
      img.alt = `Фото из поездки, ${new Date(item.created).toLocaleDateString('ru-RU')}`;
      tile.appendChild(img);

      tile.addEventListener('click', () => openLightbox(index));
      grid.appendChild(tile);

      if (prefersReducedMotion) {
        tile.classList.add('in-view');
      } else {
        tileObserver.observe(tile);
      }
    });
  }

  function showError() {
    clearSkeletons();
    if (errorBox) errorBox.hidden = false;
  }

  fetch(API_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Yandex Disk API ${res.status}`);
      return res.json();
    })
    .then((data) => {
      const items = (data && data._embedded && data._embedded.items) || [];
      photos = items
        .filter((item) => item.media_type === 'image' && item.preview)
        .map((item) => ({
          preview: item.preview,
          full: (item.file || item.preview),
          created: item.created,
        }));

      if (!photos.length) {
        showError();
        return;
      }
      renderTiles(photos);
    })
    .catch(() => showError());

  /* ---------- Lightbox ---------- */
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');

  function openLightbox(index) {
    if (!lightbox || !lightboxImg || !photos[index]) return;
    lightboxIndex = index;
    lightboxImg.src = photos[index].full;
    lightboxImg.alt = `Фото из поездки, ${new Date(photos[index].created).toLocaleDateString('ru-RU')}`;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = '';
  }

  function stepLightbox(delta) {
    if (lightboxIndex < 0 || !photos.length) return;
    lightboxIndex = (lightboxIndex + delta + photos.length) % photos.length;
    lightboxImg.src = photos[lightboxIndex].full;
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', () => stepLightbox(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => stepLightbox(1));
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (!lightbox || lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') stepLightbox(-1);
    if (e.key === 'ArrowRight') stepLightbox(1);
  });

  /* Свайп для тача. */
  let touchStartX = null;
  if (lightbox) {
    lightbox.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    lightbox.addEventListener('touchend', (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) stepLightbox(dx > 0 ? -1 : 1);
      touchStartX = null;
    }, { passive: true });
  }
})();
