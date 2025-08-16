'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

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
}: FeatureGuideRailProps) {
  const svgRef = useRef<SVGSVGElement>(null);
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
    recalc();
    const ro = new ResizeObserver(recalc);
    ro.observe(document.body);
    const onScroll = () => recalc();
    window.addEventListener('resize', recalc);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('resize', recalc);
      window.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchors.map(a => a.id).join('|'), endBeforeId, endOffset]);

  const d = useMemo(() => {
    const cx = 50;
    const bottom = Math.max(0, Math.min(100, bottomPercent));
    const segments: string[] = [`M ${cx},0 L ${cx},${bottom}`];
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
      segments.push(
        `M ${cx},${yClamped} C ${cx + ctrlDelta},${yClamped} ${cx + ctrlDelta * 2},${yClamped} ${endX},${yClamped}`
      );
    });
    return segments.join(' ');
  }, [yPercents, xEnds, anchors, endLeftX, endRightX, bottomPercent]);

  return (
    <svg
      ref={svgRef}
      className={className}
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.18}
      />
    </svg>
  );
}

export default FeatureGuideRail;
