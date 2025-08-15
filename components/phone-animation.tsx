'use client';

import React from 'react';

interface PhoneAnimationProps {
  className?: string;
}

// Classic landline phone animation (brand green). SVG + CSS keyframes, loops.
// Respects prefers-reduced-motion.
export function PhoneAnimation({ className }: PhoneAnimationProps) {
  return (
    <div className={className} aria-hidden>
      <div className="mx-auto w-full max-w-sm select-none">
        <svg viewBox="0 0 360 260" className="mx-auto block h-auto w-full">
          {/* Waves container (visibility gated by ringWindow) */}
          <g className="ring-window" transform="translate(270,110)">
            <g className="wave wave-1">
              <path
                d="M0,0 C30,-10 60,-10 90,0"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.6"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>
            <g className="wave wave-2">
              <path
                d="M0,0 C38,-14 76,-14 114,0"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>
            <g className="wave wave-3">
              <path
                d="M0,0 C46,-18 92,-18 138,0"
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="6"
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* Phone group colored with brand green (via currentColor) */}
          <g className="phone text-primary">
            {/* Base shadow */}
            <ellipse
              cx="180"
              cy="230"
              rx="120"
              ry="18"
              fill="black"
              opacity="0.08"
            />

            {/* Base (wedge) */}
            <g className="base-group">
              <path
                d="M90,145 L270,145 L250,210 L110,210 Z"
                fill="currentColor"
              />
              {/* Upper bevel */}
              <path
                d="M90,145 L270,145 L262,165 L98,165 Z"
                fill="rgba(0,0,0,0.08)"
              />
              {/* Keypad panel */}
              <rect
                x="120"
                y="155"
                width="120"
                height="48"
                rx="8"
                fill="white"
                opacity="0.95"
              />
              {/* Keypad dots */}
              {Array.from({ length: 12 }).map((_, i) => {
                const col = i % 3;
                const row = Math.floor(i / 3);
                const cx = 138 + col * 40;
                const cy = 170 + row * 16;
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={4.5}
                    fill="#1f2937"
                    opacity="0.92"
                  />
                );
              })}
              {/* Cradle pads */}
              <rect
                x="112"
                y="132"
                width="34"
                height="12"
                rx="6"
                fill="currentColor"
              />
              <rect
                x="214"
                y="132"
                width="34"
                height="12"
                rx="6"
                fill="currentColor"
              />
            </g>

            {/* Curly cord (rest vs lifted) */}
            <g className="cord">
              {/* Rest position: attach near right cradle pad to left side of handset */}
              <path
                className="cord-rest"
                d="M210,126 Q196,132 182,126 Q168,120 156,124 Q144,128 132,118 Q120,110 108,114 Q100,116 96,118"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Lifted: stretch towards handset pivot when lifted */}
              <path
                className="cord-up"
                d="M210,126 Q196,140 180,132 Q166,124 156,132 Q146,140 130,110 Q118,96 106,90 Q100,86 96,82"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0"
              />
            </g>

            {/* Handset (recognizable shape) */}
            <g className="handset" transform="translate(97,104)">
              {/* Left earpiece */}
              <rect
                x="0"
                y="0"
                width="64"
                height="28"
                rx="14"
                fill="currentColor"
              />
              {/* Bridge between earpieces */}
              <rect
                x="64"
                y="6"
                width="38"
                height="16"
                rx="8"
                fill="currentColor"
              />
              {/* Right earpiece */}
              <rect
                x="102"
                y="0"
                width="64"
                height="28"
                rx="14"
                fill="currentColor"
              />
              {/* Speaker holes */}
              {Array.from({ length: 5 }).map((_, i) => (
                <circle
                  key={`l-${i}`}
                  cx={14 + i * 10}
                  cy={14}
                  r={2}
                  fill="white"
                  opacity="0.85"
                />
              ))}
              {Array.from({ length: 5 }).map((_, i) => (
                <circle
                  key={`r-${i}`}
                  cx={102 + 14 + i * 10}
                  cy={14}
                  r={2}
                  fill="white"
                  opacity="0.85"
                />
              ))}
            </g>
          </g>
        </svg>
      </div>

      <style jsx>{`
        /* Timeline: 0-35% ring (vibrate + waves). 35-45% lift. 45-66% hold. 66-86% hang. 86-100% pause. */
        :global(.ring-window) {
          animation: ringWindow 6s infinite steps(1, end);
          opacity: 1;
        }
        /* Vibrate entire phone during the ring window */
        .phone {
          animation: vibrate 6s infinite;
          transform-origin: 180px 165px;
          transform-box: fill-box;
        }
        /* Cord visibility states */
        .cord-rest {
          animation: cordRest 6s infinite steps(1, end);
        }
        .cord-up {
          animation: cordUp 6s infinite steps(1, end);
        }

        /* Waves continuously pulse but visibility toggled by ring-window */
        .wave {
          transform-origin: 0 0;
          transform-box: fill-box;
          animation: wave 1.1s linear infinite;
        }
        .wave-2 {
          animation-delay: 0.18s;
        }
        .wave-3 {
          animation-delay: 0.36s;
        }

        /* Handset picks up after ringing, then returns */
        .handset {
          transform-origin: 32px 14px;
          transform-box: fill-box;
          animation: handsetCycle 6s infinite ease-in-out;
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .phone,
          .wave,
          .handset,
          .cord-rest,
          .cord-up,
          :global(.ring-window) {
            animation: none !important;
          }
        }

        @keyframes ringWindow {
          0% {
            opacity: 1;
          }
          36% {
            opacity: 1;
          }
          37% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes vibrate {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          4% {
            transform: translate(1px, -0.8px) rotate(-0.6deg);
          }
          8% {
            transform: translate(-1px, 0.8px) rotate(0.6deg);
          }
          12% {
            transform: translate(1.1px, -0.7px) rotate(-0.6deg);
          }
          16% {
            transform: translate(-1.1px, 0.7px) rotate(0.6deg);
          }
          20% {
            transform: translate(0.6px, -0.4px) rotate(-0.3deg);
          }
          24% {
            transform: translate(-0.6px, 0.4px) rotate(0.3deg);
          }
          28% {
            transform: translate(0.3px, -0.2px) rotate(-0.15deg);
          }
          35% {
            transform: translate(0, 0) rotate(0deg);
          }
          36% {
            transform: translate(0, 0) rotate(0deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }

        @keyframes wave {
          0% {
            transform: scale(0.9);
            opacity: 0;
          }
          20% {
            transform: scale(1);
            opacity: 0.9;
          }
          60% {
            transform: scale(1.12);
            opacity: 0.2;
          }
          100% {
            transform: scale(1.2);
            opacity: 0;
          }
        }

        @keyframes handsetCycle {
          0% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          35% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          /* Pick up */
          45% {
            transform: translate(2px, -34px) rotate(-7deg);
          }
          58% {
            transform: translate(2px, -36px) rotate(-9deg);
          }
          /* Hold */
          66% {
            transform: translate(2px, -36px) rotate(-9deg);
          }
          /* Hang up */
          76% {
            transform: translate(1px, -16px) rotate(-4deg);
          }
          86% {
            transform: translate(0px, 0px) rotate(0deg);
          }
          100% {
            transform: translate(0px, 0px) rotate(0deg);
          }
        }
        @keyframes cordRest {
          0%,
          44% {
            opacity: 1;
          }
          45%,
          100% {
            opacity: 0;
          }
        }
        @keyframes cordUp {
          0%,
          44% {
            opacity: 0;
          }
          45%,
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default PhoneAnimation;
