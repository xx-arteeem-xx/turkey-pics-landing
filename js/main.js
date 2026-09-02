(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
      navToggle.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
    });

    siteNav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Открыть меню');
      });
    });
  }

  /* ---------- Scrollspy — подсветка активного пункта меню ---------- */
  const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  if (sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = `#${entry.target.id}`;
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === id);
          });
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    sections.forEach((section) => spy.observe(section));
  }

  /* ---------- Reveal-on-scroll ---------- */
  const revealTargets = document.querySelectorAll('.reveal-up');
  if (revealTargets.length) {
    if (prefersReducedMotion) {
      revealTargets.forEach((el) => el.classList.add('in-view'));
    } else {
      const revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              revealObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );
      revealTargets.forEach((el, i) => {
        el.style.transitionDelay = `${Math.min(i, 6) * 70}ms`;
        revealObserver.observe(el);
      });
    }
  }

  /* ---------- Dev / changelog ---------- */
  const CHANGELOG = [
    { tag: 'feat', text: 'MVP: pickMultiImage → превью сеткой → загрузка в TurkeyTrip2026 на Яндекс.Диске.' },
    { tag: 'fix', text: 'R8/минификация выключена в релизе — обфускация ломала рефлексию WorkManager, приложение падало на старте у всех, кто ставил APK.' },
    { tag: 'feat', text: 'Редизайн «ночной пляж»: тёмная палитра, стеклянные карточки, градиентные pill-кнопки, звёзды/закат/волны на фоне.' },
    { tag: 'feat', text: 'Анимационный слой: мерцание звёзд, пульс солнца, дрейф волн, staggered-появления, press-эффекты кнопок.' },
    { tag: 'feat', text: 'Фоновая догрузка без интернета — партия переживает закрытие приложения и убийство процесса ОС.' },
    { tag: 'feat', text: 'Весь HTTP-цикл загрузки перенесён из Dart в нативный BackgroundUploadWorker (Kotlin/WorkManager) — файлы сразу перемещаются в app-private папку, потерять партию при kill-процессе стало невозможно.' },
    { tag: 'feat', text: 'Незакрываемое foreground-уведомление с прогрессом загрузки, с ре-постом каждые ~2 МБ на Android 14+.' },
    { tag: 'fix', text: 'Счётчик «10 фоток с момента загрузки» переведён на нативный Kotlin Worker с ContentUriTrigger — Dart/WorkManager-изолят ненадёжен в фоне на реальных телефонах.' },
    { tag: 'chore', text: 'Иконка лаунчера отрендерена из настоящего глифа Material-шрифта (beach_access_rounded) — гарантия «1 в 1» с иконкой на самом экране.' },
  ];

  const TAG_LABEL = { feat: 'feat', fix: 'fix', chore: 'chore' };

  const devLog = document.getElementById('devLog');
  if (devLog) {
    devLog.innerHTML = CHANGELOG.map(
      (entry) => `<li><span class="dev-log-tag tag-${entry.tag}">${TAG_LABEL[entry.tag]}</span><span>${entry.text}</span></li>`
    ).join('');
  }

  const devToggle = document.getElementById('devToggle');
  const devPanel = document.getElementById('devPanel');
  if (devToggle && devPanel) {
    devToggle.addEventListener('click', () => {
      const isOpen = devToggle.getAttribute('aria-expanded') === 'true';
      devToggle.setAttribute('aria-expanded', String(!isOpen));
      devPanel.hidden = isOpen;
    });
  }

  /* ---------- Размер/дата APK — из downloads/version.json ---------- */
  // Тот же манифест, что читает UpdateChecker в приложении для проверки
  // обновлений (см. turkey-pics-app/lib/services/update_checker.dart) —
  // одна точка правды вместо руками вписанных мегабайт, которые тут же
  // расходятся с реальным файлом при следующей пересборке.
  const heroCtaNote = document.getElementById('heroCtaNote');
  const devBetaNote = document.getElementById('devBetaNote');

  const formatMb = (bytes) => (bytes / 1024 / 1024).toFixed(1).replace('.', ',');
  const formatDate = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  fetch(`./downloads/version.json?t=${Date.now()}`, { cache: 'no-cache' })
    .then((res) => (res.ok ? res.json() : null))
    .then((manifest) => {
      if (!manifest) return;

      if (heroCtaNote && manifest.prod && manifest.prod.sizeBytes) {
        heroCtaNote.textContent = `APK для Android · ${formatMb(manifest.prod.sizeBytes)} МБ · ставится напрямую, без Google Play`;
      }

      if (devBetaNote && manifest.beta) {
        const parts = [];
        if (manifest.beta.sizeBytes) parts.push(`${formatMb(manifest.beta.sizeBytes)} МБ`);
        const date = manifest.beta.updatedAt ? formatDate(manifest.beta.updatedAt) : null;
        if (date) parts.push(`собрано ${date}`);
        if (parts.length) devBetaNote.textContent = parts.join(' · ');
      }
    })
    .catch(() => {
      // Лендинг — статика без бэкенда, манифест мог не задеплоиться ещё
      // или сеть подвела; тексты в HTML — валидный фолбэк сами по себе.
    });
})();
