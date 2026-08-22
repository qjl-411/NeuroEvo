import { initBrainScene } from './brainScene.js';
import { initPillScene } from './pillScene.js';
import { initRingScene } from './ringScene.js';
import { initNeuralBackground } from './neuralBackground.js';

function initHeroOrbitCarousel() {
  const hero = document.querySelector('.hero-area');
  if (!hero) return () => {};

  const indicator = hero.querySelector('.scroll-indicator');
  const indicatorText = hero.querySelector('.scroll-indicator__text');
  const track = hero.querySelector('#orbitTrack');
  const stage = hero.querySelector('#orbitStage');
  const cards = Array.from(hero.querySelectorAll('.orbit-card'));

  if (!track || !stage || !cards.length) return () => {};

  let active = -1; // -1 = show the original central apparatus.
  let wheelSum = 0;
  let touchStartY = null;
  let locked = false;
  const stepAngle = 360 / cards.length;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // Cursor light is intentionally active only on the focused reel. Pointer
  // events are coalesced into one rAF update and the card rect is cached on
  // pointer-enter, avoiding layout reads on every pointermove event.
  const pointerHandlers = new Map();
  const resetPointerLight = (card) => {
    card.classList.remove('is-pointer-lit');
    card.style.removeProperty('--spot-x');
    card.style.removeProperty('--spot-y');
  };

  if (finePointer) {
    cards.forEach((card) => {
      let rect = null;
      let pendingX = 50;
      let pendingY = 50;
      let lightRaf = 0;

      const flushLight = () => {
        lightRaf = 0;
        if (!card.matches('.is-active, .is-neighbor')) return;
        card.style.setProperty('--spot-x', `${pendingX.toFixed(1)}%`);
        card.style.setProperty('--spot-y', `${pendingY.toFixed(1)}%`);
      };

      const queueLight = (event) => {
        if (!rect || !rect.width || !rect.height) return;
        pendingX = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
        pendingY = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
        if (!lightRaf) lightRaf = requestAnimationFrame(flushLight);
      };

      const onPointerEnter = (event) => {
        if (event.pointerType === 'touch' || !card.matches('.is-active, .is-neighbor')) return;
        rect = card.getBoundingClientRect();
        card.classList.add('is-pointer-lit');
        queueLight(event);
      };

      const onPointerMove = (event) => {
        if (event.pointerType === 'touch' || !card.matches('.is-active, .is-neighbor')) return;
        if (!rect) rect = card.getBoundingClientRect();
        card.classList.add('is-pointer-lit');
        queueLight(event);
      };

      const onPointerLeave = () => {
        rect = null;
        if (lightRaf) cancelAnimationFrame(lightRaf);
        lightRaf = 0;
        resetPointerLight(card);
      };

      card.addEventListener('pointerenter', onPointerEnter, { passive: true });
      card.addEventListener('pointermove', onPointerMove, { passive: true });
      card.addEventListener('pointerleave', onPointerLeave, { passive: true });
      pointerHandlers.set(card, {
        onPointerEnter, onPointerMove, onPointerLeave,
        invalidate: () => { rect = null; },
        cancel: () => lightRaf && cancelAnimationFrame(lightRaf),
      });
    });
  }

  const wrappedDelta = (index, center) => {
    let delta = index - center;
    const half = cards.length / 2;
    while (delta > half) delta -= cards.length;
    while (delta < -half) delta += cards.length;
    return delta;
  };

  // Keep the landing prompt visually stable. Carousel state must never rewrite it.
  const keepIndicatorTextStable = () => {
    if (indicatorText) indicatorText.textContent = '向下探索';
  };


  const sync = () => {
    track.style.setProperty('--orbit-spin', `${-(Math.max(active, 0)) * stepAngle}deg`);

    cards.forEach((card, index) => {
      const delta = active < 0 ? index : wrappedDelta(index, active);
      const distance = Math.abs(delta);
      const isActive = index === active;
      card.classList.toggle('is-active', isActive);
      card.classList.toggle('is-neighbor', active >= 0 && distance === 1);
      card.classList.toggle('is-far', active >= 0 && distance >= 2);
      card.classList.toggle('is-left', active >= 0 && delta < 0);
      card.classList.toggle('is-right', active >= 0 && delta > 0);
      card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      pointerHandlers.get(card)?.invalidate?.();
      if (!(isActive || (active >= 0 && distance === 1))) resetPointerLight(card);
    });
  };

  const show = (index = 0) => {
    active = Math.max(0, Math.min(cards.length - 1, index));
    hero.classList.add('carousel-active');
    keepIndicatorTextStable();
    sync();
  };

  const hide = () => {
    active = -1;
    hero.classList.remove('carousel-active');
    keepIndicatorTextStable();
    sync();
  };

  // The landing page is intentionally hero-only now. At the last reel, further
  // downward input is absorbed instead of revealing a removed content section.
  const consume = (direction) => {
    if (direction > 0) {
      if (active < 0) {
        show(0);
        return true;
      }
      if (active < cards.length - 1) {
        active += 1;
        sync();
        return true;
      }
      return true;
    }

    if (direction < 0) {
      if (active > 0) {
        active -= 1;
        sync();
        return true;
      }
      if (active === 0) {
        hide();
        return true;
      }
      return true;
    }

    return false;
  };

  const withLock = (fn) => {
    if (locked) return false;
    const handled = fn();
    if (handled) {
      locked = true;
      window.setTimeout(() => { locked = false; }, prefersReducedMotion ? 100 : 520);
    }
    return handled;
  };

  const onWheel = (event) => {
    event.preventDefault();
    if (locked) {
      wheelSum = 0;
      return;
    }

    wheelSum += event.deltaY;
    if (Math.abs(wheelSum) < 18) return;

    const direction = Math.sign(wheelSum);
    wheelSum = 0;
    withLock(() => consume(direction));
  };

  const onKeydown = (event) => {
    const isForward = ['ArrowDown', 'ArrowRight', 'PageDown', ' '].includes(event.key);
    const isBackward = ['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key);
    if (!isForward && !isBackward) return;
    event.preventDefault();
    withLock(() => consume(isForward ? 1 : -1));
  };

  const onIndicatorTrigger = (event) => {
    event.preventDefault();
    withLock(() => consume(1));
  };

  const onTouchStart = (event) => {
    touchStartY = event.touches[0]?.clientY ?? null;
  };

  const onTouchMove = (event) => {
    if (touchStartY !== null) event.preventDefault();
  };

  const onTouchEnd = (event) => {
    if (touchStartY === null) return;
    const endY = event.changedTouches[0]?.clientY ?? touchStartY;
    const delta = touchStartY - endY;
    touchStartY = null;
    if (Math.abs(delta) < 42) return;
    withLock(() => consume(Math.sign(delta)));
  };


  const onIndicatorKeydown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') onIndicatorTrigger(event);
  };

  // While the 3D reel is open, any click on the stage that is not inside a
  // card exits the carousel immediately, regardless of the active card index.
  const onStageClick = (event) => {
    if (active < 0) return;
    if (event.target.closest('.orbit-card')) return;
    event.preventDefault();
    event.stopPropagation();
    wheelSum = 0;
    locked = false;
    hide();
  };

  indicator?.addEventListener('click', onIndicatorTrigger);
  stage.addEventListener('click', onStageClick);
  indicator?.addEventListener('keydown', onIndicatorKeydown);
  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });

  keepIndicatorTextStable();
  sync();

  return () => {
    hero.classList.remove('carousel-active');
    pointerHandlers.forEach(({ onPointerEnter, onPointerMove, onPointerLeave, cancel }, card) => {
      cancel?.();
      card.removeEventListener('pointerenter', onPointerEnter);
      card.removeEventListener('pointermove', onPointerMove);
      card.removeEventListener('pointerleave', onPointerLeave);
      resetPointerLight(card);
    });
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    indicator?.removeEventListener('click', onIndicatorTrigger);
    stage.removeEventListener('click', onStageClick);
    indicator?.removeEventListener('keydown', onIndicatorKeydown);
  };
}

export function initLandingScene() {
  const cleanups = [initNeuralBackground(), initRingScene(), initPillScene(), initBrainScene(), initHeroOrbitCarousel()];

  return () => {
    cleanups.reverse().forEach((cleanup) => {
      try { cleanup?.(); } catch (error) { console.error('Landing cleanup failed', error); }
    });
  };
}
