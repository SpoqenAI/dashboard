'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  motion,
  motionValue,
  useInView,
  useReducedMotion,
  useTransform,
  useMotionValueEvent,
} from 'motion/react';

type BranchAnchor = {
  side: 'left' | 'right';
  id: string;
  offset?: number; // px adjustment if needed
};

interface FeatureGuideRailProps {
  anchors: BranchAnchor[];
  className?: string;
  strokeWidth?: number;
  endLeftX?: number; // 0..100
  endRightX?: number; // 0..100
  endBeforeId?: string; // stop the vertical rail before this element
  endOffset?: number; // px padding before endBeforeId
  followViewportRatio?: number; // 0..1 (default 0.75)
}

/**
 * A full-height decorative vertical rail with branches that align to actual
 * DOM element positions (by id). Place inside a relatively positioned parent
 * and stretch to h-full/w-full. This is visual-only (aria-hidden).
 */
export function FeatureGuideRail({
  anchors,
  className,
  strokeWidth = 2,
  endLeftX = 15,
  endRightX = 85,
  endBeforeId,
  endOffset = 16,
  followViewportRatio = 0.75,
}: FeatureGuideRailProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const reducedMotion = useReducedMotion();
  const inView = useInView(wrapperRef, { amount: 0.2 });
  const [yPercents, setYPercents] = useState<number[]>([]);
  const [xEnds, setXEnds] = useState<number[]>([]);
  const [bottomPercent, setBottomPercent] = useState<number>(100);

  const recalc = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const h = Math.max(1, rect.height);
    const w = Math.max(1, rect.width);
    const cxPx = rect.left + w * 0.5;
    const paddingPx = 16;
    const minLenPx = 24;

    // Compute bottom limit relative to the SVG box
    if (endBeforeId) {
      const endEl = document.getElementById(endBeforeId);
      if (endEl) {
        const endRect = endEl.getBoundingClientRect();
        const edgePx = endRect.top - rect.top - (endOffset ?? 0);
        const pct = Math.max(0, Math.min(100, (edgePx / h) * 100));
        setBottomPercent(pct);
      } else {
        setBottomPercent(100);
      }
    } else {
      setBottomPercent(100);
    }

    const ys = anchors.map(a => {
      const el = document.getElementById(a.id);
      if (!el) return 50;
      const r = el.getBoundingClientRect();
      const centerY = r.top + r.height * 0.5 + (a.offset ?? 0);
      const y = ((centerY - rect.top) / h) * 100;
      return Math.max(0, Math.min(100, y));
    });
    setYPercents(ys);

    const xs = anchors.map(a => {
      const el = document.getElementById(a.id);
      const row = el?.closest('[data-feature-row]') as HTMLElement | null;
      const anim = row?.querySelector('[data-anim]') as HTMLElement | null;
      if (!row || !anim) {
        // Fallback: short branch near center
        const len = (minLenPx / w) * 100;
        return a.side === 'left' ? 50 - len : 50 + len;
      }

      const animRect = anim.getBoundingClientRect();
      // Compute branch end just before entering the animation column area
      if (a.side === 'left') {
        const targetPx = Math.min(cxPx - minLenPx, animRect.right + paddingPx);
        const clamped = Math.min(
          cxPx - minLenPx,
          Math.max(rect.left, targetPx)
        );
        return ((clamped - rect.left) / w) * 100;
      } else {
        const targetPx = Math.max(cxPx + minLenPx, animRect.left - paddingPx);
        const clamped = Math.max(
          cxPx + minLenPx,
          Math.min(rect.right, targetPx)
        );
        return ((clamped - rect.left) / w) * 100;
      }
    });
    setXEnds(xs);
  };

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        recalc();
      });
    };

    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(wrapperRef.current ?? document.body);
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('resize', schedule);
      ro.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchors.map(a => a.id).join('|'), endBeforeId, endOffset]);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      recalc();
      if (t - start < 850) raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, anchors.map(a => a.id).join('|'), endBeforeId, endOffset]);

  const paths = useMemo(() => {
    const cx = 50;
    const bottom = Math.max(0, Math.min(100, bottomPercent));
    const safeBottom = Math.max(1, bottom);
    const verticalD = `M ${cx},0 L ${cx},${bottom}`;
    const branchDs: string[] = [];
    const branchStarts: number[] = [];

    yPercents.forEach((y, idx) => {
      const side = anchors[idx]?.side ?? 'left';
      const dynamicEnd = xEnds[idx];
      const endX = Number.isFinite(dynamicEnd)
        ? dynamicEnd
        : side === 'left'
          ? endLeftX
          : endRightX;
      const ctrlDelta = side === 'left' ? -8 : 8;
      const yClamped = Math.min(y, bottom - 0.5);
      branchDs.push(
        `M ${cx},${yClamped} C ${cx + ctrlDelta},${yClamped} ${cx + ctrlDelta * 2},${yClamped} ${endX},${yClamped}`
      );
      branchStarts.push(Math.max(0, Math.min(1, yClamped / safeBottom)));
    });

    return { verticalD, branchDs, branchStarts };
  }, [yPercents, xEnds, anchors, endLeftX, endRightX, bottomPercent]);

  const revealProgress = useMemo(() => motionValue(0), []);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = Math.max(1, window.innerHeight || 1);
      const followY = vh * Math.max(0, Math.min(1, followViewportRatio));
      const denom = Math.max(1, rect.height);
      const raw = (followY - rect.top) / denom;
      revealProgress.set(Math.max(0, Math.min(1, raw)));
    };
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [followViewportRatio, revealProgress]);

  const reveal = useTransform(revealProgress, [0, 1], [0, 1], { clamp: true });
  const revealOpacity = useTransform(reveal, [0, 0.12], [0, 0.18], {
    clamp: true,
  });

  const anchorCount = anchors.length;
  const branchLengths = useMemo(() => {
    return Array.from({ length: anchorCount }, () => motionValue(0));
  }, [anchorCount]);
  const branchOpacities = useMemo(() => {
    return Array.from({ length: anchorCount }, () => motionValue(0));
  }, [anchorCount]);
  const branchStartRef = useRef<number[]>([]);
  useEffect(() => {
    branchStartRef.current = paths.branchStarts;
  }, [paths.branchStarts]);

  useMotionValueEvent(revealProgress, 'change', latest => {
    const starts = branchStartRef.current;
    const windowSize = 0.12;
    for (let i = 0; i < branchLengths.length; i++) {
      const start = starts[i] ?? 1;
      const t = (latest - start) / windowSize;
      const clamped = Math.max(0, Math.min(1, t));
      branchLengths[i]?.set(clamped);

      const fadeInStart = 0.03;
      const fadeInEnd = 0.1;
      const fadeT = Math.max(
        0,
        Math.min(1, (clamped - fadeInStart) / (fadeInEnd - fadeInStart))
      );
      branchOpacities[i]?.set(revealOpacity.get() * fadeT);
    }
  });

  return (
    <div ref={wrapperRef} className={className} aria-hidden>
      <svg
        ref={svgRef}
        className="h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <motion.path
          d={paths.verticalD}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={
            reducedMotion
              ? { pathLength: 1, opacity: 0.18 }
              : { pathLength: revealProgress, opacity: revealOpacity }
          }
        />
        {paths.branchDs.map((branchD, idx) => (
          <motion.path
            key={idx}
            d={branchD}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={
              reducedMotion
                ? { pathLength: 1, opacity: 0.18 }
                : {
                    pathLength: branchLengths[idx],
                    opacity: branchOpacities[idx],
                  }
            }
          />
        ))}
      </svg>
    </div>
  );
}

export default FeatureGuideRail;
