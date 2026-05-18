import { useEffect } from "react";

/**
 * Auto-scrolls to a target element after the user stays at the top/hero for a delay.
 * Cancels on any user interaction (scroll/wheel/touch/keydown).
 *
 * @param {Object} opts
 * @param {boolean} opts.enabled
 * @param {React.RefObject<HTMLElement>|null} opts.targetRef - preferred
 * @param {string|null} opts.targetId - alternative (used if targetRef missing)
 * @param {number} opts.delayMs
 */
export function useAutoScrollFromHero({
  enabled,
  targetRef = null,
  targetId = null,
  delayMs = 10000,
}) {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer = null;

    const cancel = () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      timer = null;
      removeListeners();
    };

    const onUserIntent = () => cancel();

    const addListeners = () => {
      window.addEventListener("wheel", onUserIntent, { passive: true });
      window.addEventListener("touchstart", onUserIntent, { passive: true });
      window.addEventListener("keydown", onUserIntent);
      window.addEventListener("scroll", onUserIntent, { passive: true });
      window.addEventListener("pointerdown", onUserIntent, { passive: true });
    };

    const removeListeners = () => {
      window.removeEventListener("wheel", onUserIntent);
      window.removeEventListener("touchstart", onUserIntent);
      window.removeEventListener("keydown", onUserIntent);
      window.removeEventListener("scroll", onUserIntent);
      window.removeEventListener("pointerdown", onUserIntent);
    };

    // Only run if user is still basically at the top (hero)
    if (window.scrollY > 10) return;

    addListeners();
    timer = window.setTimeout(() => {
      if (cancelled) return;
      if (window.scrollY > 10) return;

      const el =
        targetRef?.current ||
        (targetId ? document.getElementById(targetId) : null);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });

      cancel();
    }, delayMs);

    return () => cancel();
  }, [enabled, targetRef, targetId, delayMs]);
}


