(() => {
  'use strict';

  const NOVOSIBIRSK = { lat: 55.0084, lng: 82.9357, name: 'Новосибирск' };
  const GOYNUK = { lat: 36.535, lng: 30.552, name: 'Гёйнюк, Турция' };

  const stage = document.getElementById('globeStage');
  const mount = document.getElementById('globeViz');
  const fallback = document.getElementById('globeFallback');
  const tagStart = document.getElementById('tagStart');
  const tagEnd = document.getElementById('tagEnd');
  if (!stage || !mount) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function supportsWebGL() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  function showFallback() {
    mount.hidden = true;
    if (fallback) fallback.hidden = false;
    // Без WebGL реальную проекцию точек не посчитать — фиксируем в углах сцены.
    if (tagStart) {
      tagStart.style.left = '14%';
      tagStart.style.top = '20%';
      tagStart.classList.add('visible');
    }
    if (tagEnd) {
      tagEnd.style.left = '82%';
      tagEnd.style.top = '78%';
      tagEnd.classList.add('visible');
    }
  }

  if (typeof window.Globe !== 'function' || !supportsWebGL()) {
    showFallback();
    return;
  }

  let world;
  let ready = false;
  let inView = false;
  let started = false;

  function midpoint(a, b) {
    return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
  }

  function revealTag(el) {
    if (el) el.dataset.reveal = 'true';
  }

  function runIntro() {
    setTimeout(() => revealTag(tagStart), 300);

    // Старт: приближены к Новосибирску.
    world.pointOfView({ lat: NOVOSIBIRSK.lat, lng: NOVOSIBIRSK.lng, altitude: 0.42 }, 0);

    // Зум на всю планету — виден весь земной шар и дуга перелёта.
    setTimeout(() => {
      const mid = midpoint(NOVOSIBIRSK, GOYNUK);
      world.pointOfView({ lat: mid.lat, lng: mid.lng, altitude: 2.3 }, 2100);
    }, 650);

    // Зум на Гёйнюк/пляж.
    setTimeout(() => {
      revealTag(tagEnd);
      world.pointOfView({ lat: GOYNUK.lat, lng: GOYNUK.lng, altitude: 0.45 }, 2300);
    }, 3400);
  }

  function maybeStart() {
    if (started || !ready || !inView) return;
    started = true;

    if (prefersReducedMotion) {
      world.pointOfView({ lat: GOYNUK.lat, lng: GOYNUK.lng, altitude: 0.55 }, 0);
      revealTag(tagStart);
      revealTag(tagEnd);
    } else {
      runIntro();
    }

    startTagTracking();
  }

  /* ---------- Подписи городов — следуют за реальной проекцией точки на сфере ---------- */
  function isFrontFacing(lat, lng) {
    try {
      const p = world.getCoords(lat, lng, 0);
      const cam = world.camera().position;
      const toCam = { x: cam.x - p.x, y: cam.y - p.y, z: cam.z - p.z };
      return (p.x * toCam.x + p.y * toCam.y + p.z * toCam.z) > 0;
    } catch (e) {
      return true;
    }
  }

  function positionTag(el, point) {
    if (!el || el.dataset.reveal !== 'true') return;
    const coords = world.getScreenCoords(point.lat, point.lng, 0);
    if (!coords || !isFrontFacing(point.lat, point.lng)) {
      el.classList.remove('visible');
      return;
    }
    el.style.transform = `translate(${coords.x}px, ${coords.y}px) translate(-50%, calc(-100% - 10px))`;
    el.classList.add('visible');
  }

  let trackingStarted = false;
  function startTagTracking() {
    if (trackingStarted) return;
    trackingStarted = true;
    (function loop() {
      positionTag(tagStart, NOVOSIBIRSK);
      positionTag(tagEnd, GOYNUK);
      requestAnimationFrame(loop);
    })();
  }

  try {
    world = window.Globe({
      rendererConfig: { antialias: true, alpha: true, powerPreference: 'high-performance' },
    })
      .globeImageUrl('./assets/earth-day.jpg')
      .bumpImageUrl('./assets/earth-bump.jpg')
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#FF9070')
      .atmosphereAltitude(0.2)
      .pointsData([NOVOSIBIRSK, GOYNUK])
      .pointLat('lat')
      .pointLng('lng')
      .pointColor(() => '#FFD580')
      .pointAltitude(0.008)
      .pointRadius(0.45)
      .arcsData([{ startLat: NOVOSIBIRSK.lat, startLng: NOVOSIBIRSK.lng, endLat: GOYNUK.lat, endLng: GOYNUK.lng }])
      .arcColor(() => ['rgba(255,144,112,0.95)', 'rgba(255,122,154,0.95)'])
      .arcAltitude(0.32)
      .arcStroke(0.5)
      .arcDashLength(0.4)
      .arcDashGap(1.8)
      .arcDashAnimateTime(prefersReducedMotion ? 0 : 2200)
      .enablePointerInteraction(!prefersReducedMotion)
      .onGlobeReady(() => {
        ready = true;
        maybeStart();
      })
      (mount);
  } catch (e) {
    showFallback();
    return;
  }

  // Тонкая настройка материала и света — мутирует уже существующие
  // THREE-объекты three-globe, без импорта собственной копии THREE.
  try {
    const mat = world.globeMaterial();
    mat.bumpScale = 7;
    mat.shininess = 4;
    if (mat.specular && typeof mat.specular.setStyle === 'function') {
      mat.specular.setStyle('#2f4a58');
    }
  } catch (e) { /* кастомизация материала необязательна для работы сцены */ }

  try {
    const lights = world.lights() || [];
    const directional = lights.find((l) => l.type === 'DirectionalLight');
    if (directional) {
      directional.intensity = 1.15;
      directional.position.set(1, 0.6, 1);
    }
    const ambient = lights.find((l) => l.type === 'AmbientLight');
    if (ambient) ambient.intensity = 0.6;
  } catch (e) { /* дефолтный свет тоже смотрится нормально */ }

  function sizeGlobe() {
    const size = stage.clientWidth;
    if (size > 0) world.width(size).height(size);
  }
  sizeGlobe();
  window.addEventListener('resize', sizeGlobe);

  try {
    world.renderer().setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  } catch (e) { /* не критично, если рендерер ещё не готов */ }

  const controls = world.controls ? world.controls() : null;
  if (controls) {
    controls.enableZoom = false;
    controls.autoRotate = false;
  }

  const introObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          inView = true;
          maybeStart();
          obs.disconnect();
        }
      });
    },
    { threshold: 0.2 }
  );
  introObserver.observe(stage);
})();
