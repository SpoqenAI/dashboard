'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const Lottie = dynamic(
  () => import('react-lottie-player').then(m => m.default),
  {
    ssr: false,
  }
);

interface PhoneLottieProps {
  src?: string;
  className?: string;
  loop?: boolean;
  speed?: number;
  height?: number;
  tint?: boolean | string; // true uses CSS --primary; string expects hex or css hsl/rgba
  tintStrength?: number; // 0..1 soft hue blend (default 0.35)
  tintMode?: 'soft' | 'full'; // 'soft' keeps palette; 'full' forces brand hue
}

export function PhoneLottie({
  src,
  className,
  loop = true,
  speed = 1,
  height = 220,
  tint = true,
  tintStrength = 0.35,
  tintMode = 'soft',
}: PhoneLottieProps) {
  // Prefer explicit prop, then env URL, then a conventional local path under public
  const animationSrc =
    src ||
    process.env.NEXT_PUBLIC_PHONE_ANIMATION_URL ||
    '/animations/phone.json';

  const [data, setData] = useState<unknown | null>(null);
  const [failed, setFailed] = useState(false);
  const [tinted, setTinted] = useState<unknown | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window))
      return false;
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }, []);

  const [forceAnimations, setForceAnimations] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const q =
        params.get('anim') ||
        params.get('animations') ||
        params.get('force-animations');
      if (q && /^(1|true|on|force)$/i.test(q)) {
        localStorage.setItem('spq_force_animations', '1');
      } else if (q && /^(0|false|off)$/i.test(q)) {
        localStorage.removeItem('spq_force_animations');
      }
      const read = () =>
        setForceAnimations(
          localStorage.getItem('spq_force_animations') === '1'
        );
      read();
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'spq_force_animations') read();
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    } catch {
      setForceAnimations(false);
    }
  }, []);

  const shouldPlay =
    inView && (!prefersReducedMotion || forceAnimations) && !failed && !!tinted;

  function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0,
      g = 0,
      b = 0;
    if (0 <= h && h < 60) [r, g, b] = [c, x, 0];
    else if (60 <= h && h < 120) [r, g, b] = [x, c, 0];
    else if (120 <= h && h < 180) [r, g, b] = [0, c, x];
    else if (180 <= h && h < 240) [r, g, b] = [0, x, c];
    else if (240 <= h && h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }

  function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    let h = 0,
      s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max - min);
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        default:
          h = (r - g) / d + 4;
          break;
      }
      h *= 60;
    }
    return [h, s, l];
  }

  function parseCssColorToRgb(
    color: string | null | undefined
  ): [number, number, number] | null {
    if (!color) return null;
    const c = color.trim();
    // hex #rrggbb
    if (c.startsWith('#')) {
      const hex = c.replace('#', '');
      const bigint = parseInt(
        hex.length === 3
          ? hex
              .split('')
              .map(ch => ch + ch)
              .join('')
          : hex,
        16
      );
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return [r, g, b];
    }
    // hsl( h s% l% ) or raw "h s% l%"
    const hslMatch = c.match(
      /^(?:hsl\(|)(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%\s*,?\s*(\d+(?:\.\d+)?)%\)?$/i
    );
    if (hslMatch) {
      const h = parseFloat(hslMatch[1]);
      const s = parseFloat(hslMatch[2]) / 100;
      const l = parseFloat(hslMatch[3]) / 100;
      return hslToRgb(h, s, l);
    }
    // rgb()/rgba() support: accepts comma- or space-separated, numeric (0-255) or percentage channels
    // Examples: rgb(255, 0, 0), rgba(255,0,0,0.5), rgb(100% 0% 0%), rgba(50% 25% 0% / 40%)
    const rgbFuncMatch = c.match(/^rgba?\((.*)\)$/i);
    if (rgbFuncMatch) {
      const inside = rgbFuncMatch[1].trim();

      const clamp = (value: number, min: number, max: number): number =>
        Math.min(max, Math.max(min, value));

      const parseChannel = (token: string): number => {
        const t = token.trim();
        const percent = t.match(/^([+-]?\d+(?:\.\d+)?)%$/);
        if (percent) {
          const pct = parseFloat(percent[1]);
          if (Number.isNaN(pct)) return NaN;
          return Math.round(clamp(pct, 0, 100) * 2.55);
        }
        const num = parseFloat(t);
        if (Number.isNaN(num)) return NaN;
        // Be tolerant of 0..1 inputs by scaling to 0..255
        const scaled = num <= 1 && num >= 0 ? num * 255 : num;
        return Math.round(clamp(scaled, 0, 255));
      };

      let rStr = '';
      let gStr = '';
      let bStr = '';

      if (inside.includes(',')) {
        // Comma-separated form: r,g,b[,a]
        const parts = inside.split(/\s*,\s*/);
        if (parts.length < 3) return null;
        [rStr, gStr, bStr] = parts;
      } else {
        // Space-separated form: r g b [/ a]
        const [rgbPart] = inside.split('/').map(s => s.trim());
        const parts = rgbPart.split(/\s+/).filter(Boolean);
        if (parts.length < 3) return null;
        [rStr, gStr, bStr] = parts;
      }

      const r = parseChannel(rStr);
      const g = parseChannel(gStr);
      const b = parseChannel(bStr);
      if ([r, g, b].some(v => Number.isNaN(v))) return null;
      return [r, g, b];
    }
    // raw "r g b" (from hsl(var(--primary)) pattern sometimes stores "H S% L%"; for safety, return null)
    return null;
  }

  function getPrimaryHsl(): [number, number, number] | null {
    try {
      const root = getComputedStyle(document.documentElement);
      const raw = root.getPropertyValue('--primary')?.trim();
      const hslMatch = raw.match(
        /^(\d+(?:\.\d+)?)\s*(\d+(?:\.\d+)?)%\s*(\d+(?:\.\d+)?)%$/
      );
      if (hslMatch) {
        return [
          parseFloat(hslMatch[1]),
          parseFloat(hslMatch[2]) / 100,
          parseFloat(hslMatch[3]) / 100,
        ];
      }
      const rgb = parseCssColorToRgb(raw);
      if (rgb) return rgbToHsl(rgb[0], rgb[1], rgb[2]);
      return null;
    } catch {
      return null;
    }
  }

  function normalizeHexOrCssToRgb(
    input: string
  ): [number, number, number] | null {
    return parseCssColorToRgb(input) ?? null;
  }

  function shouldRecolorColor([r, g, b, a]: number[]): boolean {
    if (a === 0) return false;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // keep pure white and near white
    if (max > 0.98 && min > 0.95) return false;
    // keep pure black and near black for outlines
    if (max < 0.05 && min < 0.05) return false;
    return true;
  }

  function blendAngle(a: number, b: number, t: number): number {
    const delta = ((b - a + 540) % 360) - 180; // shortest path
    return (a + delta * t + 360) % 360;
  }

  function recolorRgbSoft(
    arr: number[],
    brandHsl: [number, number, number],
    strength: number
  ): [number, number, number] | null {
    const [r, g, b] = [arr[0], arr[1], arr[2]].map(v =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
    );
    const [h, s, l] = rgbToHsl(r, g, b);
    const isNearBlack = l < 0.06;
    const isNearWhite = l > 0.95;
    const isNeutral = s < 0.18;
    const isSkinRange = h >= 10 && h <= 55 && s > 0.2 && l > 0.25 && l < 0.9;
    if (isNearBlack || isNearWhite || isNeutral || isSkinRange) return null;
    const [bh, bs] = brandHsl;
    const nh = blendAngle(h, bh, strength);
    const ns = Math.max(
      0,
      Math.min(1, s * (1 - strength * 0.2) + bs * (strength * 0.2))
    );
    const nl = l; // preserve original lightness for shading
    const [nr, ng, nb] = hslToRgb(nh, ns, nl);
    return [nr / 255, ng / 255, nb / 255];
  }

  function applySoftTintToLottie(
    lottieData: unknown,
    brandHsl: [number, number, number],
    strength: number
  ): unknown {
    const clone: unknown = JSON.parse(JSON.stringify(lottieData));
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      const ty = (obj as { ty?: unknown }).ty;
      if ((ty === 'fl' || ty === 'st') && 'c' in obj) {
        const c = (obj as { c?: unknown }).c;
        if (c && typeof c === 'object') {
          const cObj = c as { a?: unknown; k?: unknown };
          const aVal = typeof cObj.a === 'number' ? cObj.a : undefined;
          const kVal = cObj.k;
          if (
            aVal === 0 &&
            Array.isArray(kVal) &&
            kVal.length >= 3 &&
            typeof (kVal as unknown[])[0] === 'number'
          ) {
            const arr = kVal as number[];
            if (shouldRecolorColor(arr)) {
              const soft = recolorRgbSoft(arr, brandHsl, strength);
              if (soft) cObj.k = [...soft, arr[3] ?? 1];
            }
          } else if (aVal === 1 && Array.isArray(kVal)) {
            // Keyframed color values
            for (const kf of kVal as unknown[]) {
              if (kf && typeof kf === 'object') {
                const sProp = (kf as { s?: unknown }).s;
                if (
                  Array.isArray(sProp) &&
                  sProp.length >= 3 &&
                  typeof (sProp as unknown[])[0] === 'number'
                ) {
                  const arr = sProp as number[];
                  if (shouldRecolorColor(arr)) {
                    const soft = recolorRgbSoft(arr, brandHsl, strength);
                    if (soft) (kf as { s: unknown }).s = [...soft, arr[3] ?? 1];
                  }
                }
              }
            }
          }
        }
      }
      for (const key of Object.keys(obj)) visit(obj[key]);
    };
    visit(clone);
    return clone;
  }

  function recolorRgbFull(
    arr: number[],
    brandHsl: [number, number, number],
    strength: number
  ): [number, number, number] | null {
    const [r, g, b] = [arr[0], arr[1], arr[2]].map(v =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
    );
    const [, s, l] = rgbToHsl(r, g, b);
    const isNearBlack = l < 0.06;
    const isNearWhite = l > 0.95;
    if (isNearBlack || isNearWhite) return null;
    const [bh, bs] = [brandHsl[0], brandHsl[1]];
    // Fully adopt brand hue; blend saturation a bit so extremely saturated blues don't become neon
    const ns = Math.max(0, Math.min(1, s * (1 - strength) + bs * strength));
    const nl = l;
    const [nr, ng, nb] = hslToRgb(bh, ns, nl);
    return [nr / 255, ng / 255, nb / 255];
  }

  function applyFullTintToLottie(
    lottieData: unknown,
    brandHsl: [number, number, number],
    strength: number
  ): unknown {
    const clone: unknown = JSON.parse(JSON.stringify(lottieData));
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const obj = node as Record<string, unknown>;
      const ty = (obj as { ty?: unknown }).ty;
      if ((ty === 'fl' || ty === 'st') && 'c' in obj) {
        const c = (obj as { c?: unknown }).c;
        if (c && typeof c === 'object') {
          const cObj = c as { a?: unknown; k?: unknown };
          const aVal = typeof cObj.a === 'number' ? cObj.a : undefined;
          const kVal = cObj.k;
          if (
            aVal === 0 &&
            Array.isArray(kVal) &&
            kVal.length >= 3 &&
            typeof (kVal as unknown[])[0] === 'number'
          ) {
            const arr = kVal as number[];
            const full = recolorRgbFull(arr, brandHsl, strength);
            if (full) cObj.k = [...full, arr[3] ?? 1];
          } else if (aVal === 1 && Array.isArray(kVal)) {
            for (const kf of kVal as unknown[]) {
              if (kf && typeof kf === 'object') {
                const sProp = (kf as { s?: unknown }).s;
                if (
                  Array.isArray(sProp) &&
                  sProp.length >= 3 &&
                  typeof (sProp as unknown[])[0] === 'number'
                ) {
                  const arr = sProp as number[];
                  const full = recolorRgbFull(arr, brandHsl, strength);
                  if (full) (kf as { s: unknown }).s = [...full, arr[3] ?? 1];
                }
              }
            }
          }
        }
      }
      for (const key of Object.keys(obj)) visit(obj[key]);
    };
    visit(clone);
    return clone;
  }

  useEffect(() => {
    let mounted = true;
    setFailed(false);
    setData(null);
    setTinted(null);
    fetch(animationSrc, { cache: 'force-cache' })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load Lottie');
        const json = await res.json();
        if (mounted) setData(json);
      })
      .catch(() => {
        if (mounted) setFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, [animationSrc]);

  // Apply tint when data or tint option changes
  useEffect(() => {
    if (!data) return;
    if (!tint) {
      setTinted(data);
      return;
    }
    let brandHsl: [number, number, number] | null = null;
    if (typeof tint === 'string') {
      const rgb = normalizeHexOrCssToRgb(tint);
      brandHsl = rgb ? rgbToHsl(rgb[0], rgb[1], rgb[2]) : null;
    } else {
      brandHsl = getPrimaryHsl();
    }
    if (!brandHsl) {
      setTinted(data);
      return;
    }
    const strength = Math.max(0, Math.min(1, tintStrength));
    const recolored =
      tintMode === 'full'
        ? applyFullTintToLottie(data, brandHsl, strength)
        : applySoftTintToLottie(data, brandHsl, strength);
    setTinted(recolored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tint, tintStrength, tintMode]);

  // Observe visibility to control play/pause reliably
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    const onVisible = (entries: IntersectionObserverEntry[]) => {
      if (destroyed) return;
      for (const e of entries) {
        if (e.target !== containerRef.current) continue;
        setInView(Boolean(e.isIntersecting));
      }
    };

    const io = new IntersectionObserver(onVisible, { rootMargin: '150px' });
    io.observe(containerRef.current);

    const onVisChange = () => {
      if (document.hidden) setInView(false);
    };
    document.addEventListener('visibilitychange', onVisChange, {
      passive: true,
    });

    return () => {
      destroyed = true;
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, []);

  if (!tinted) {
    return (
      <div
        className={`phone-lottie-container ${className || ''}`}
        aria-hidden
        ref={containerRef}
        style={{ minHeight: 1 }}
      >
        <div
          style={{ width: '100%', height }}
          className="flex items-center justify-center rounded-lg border border-border bg-muted/10"
        >
          {/* Dev hint if asset missing */}
          <span className="text-xs text-muted-foreground">
            {failed
              ? 'Add NEXT_PUBLIC_PHONE_ANIMATION_URL or place /public/animations/phone.json'
              : 'Loading animation…'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`phone-lottie-container ${className || ''}`}
      aria-hidden
      ref={containerRef}
      style={{ minHeight: 1 }}
    >
      <Lottie
        play={shouldPlay}
        loop={loop}
        speed={speed}
        renderer="svg"
        style={{ width: '100%', height }}
        animationData={tinted}
      />
    </div>
  );
}

export default PhoneLottie;
