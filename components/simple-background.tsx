import { cn } from '@/lib/utils';

interface SimpleBackgroundProps {
  children: React.ReactNode;
  variant?: 'hero' | 'features' | 'minimal';
  className?: string;
}

export function SimpleBackground({
  children,
  variant = 'hero',
  className,
}: SimpleBackgroundProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-background',
        className
      )}
    >
      {/* CSS-only animated background circles */}
      <div className="pointer-events-none absolute inset-0">
        {variant === 'hero' && (
          <>
            {/* Large primary circle - diagonal drift */}
            <div className="absolute top-[-6rem] right-[-6rem] h-96 w-96">
              <div
                className="h-full w-full rounded-full opacity-20 blur-3xl"
                style={{
                  background: 'radial-gradient(circle, hsl(315 100% 50%) 0%, hsl(270 100% 60%) 70%, transparent 100%)',
                  animation: 'float-diagonal 20s ease-in-out infinite',
                }}
              />
            </div>
            {/* Medium secondary circle - horizontal drift */}
            <div className="absolute top-1/2 left-[-8rem] h-80 w-80" style={{ transform: 'translateY(-50%)' }}>
              <div
                className="h-full w-full rounded-full opacity-15 blur-2xl"
                style={{
                  background: 'radial-gradient(circle, hsl(180 100% 50%) 0%, hsl(200 100% 60%) 70%, transparent 100%)',
                  animation: 'float-horizontal 25s ease-in-out infinite reverse',
                }}
              />
            </div>
            {/* Small accent circle - vertical drift */}
            <div className="absolute bottom-[6rem] right-[33%] h-64 w-64">
              <div
                className="h-full w-full rounded-full opacity-10 blur-xl"
                style={{
                  background: 'radial-gradient(circle, hsl(270 100% 60%) 0%, hsl(315 100% 50%) 70%, transparent 100%)',
                  animation: 'float-vertical 30s ease-in-out infinite',
                }}
              />
            </div>
          </>
        )}
        {variant === 'features' && (
          <>
            {/* Subtle background circles for features */}
            <div className="absolute top-[4rem] right-[4rem] h-64 w-64">
              <div
                className="h-full w-full rounded-full opacity-8 blur-2xl"
                style={{
                  background: 'radial-gradient(circle, hsl(315 100% 50%) 0%, transparent 70%)',
                  animation: 'float-slow 35s ease-in-out infinite',
                }}
              />
            </div>
            <div className="absolute bottom-[8rem] left-[4rem] h-48 w-48">
              <div
                className="h-full w-full rounded-full opacity-6 blur-xl"
                style={{
                  background: 'radial-gradient(circle, hsl(180 100% 50%) 0%, transparent 70%)',
                  animation: 'float-slow 40s ease-in-out infinite reverse',
                }}
              />
            </div>
          </>
        )}
        {variant === 'minimal' && (
          /* Very subtle single circle for minimal variant */
          <div className="absolute top-1/2 left-1/2 h-96 w-96" style={{ transform: 'translate(-50%, -50%)' }}>
            <div
              className="h-full w-full rounded-full opacity-5 blur-3xl"
              style={{
                background: 'radial-gradient(circle, hsl(315 100% 50%) 0%, transparent 70%)',
                animation: 'float-gentle 45s ease-in-out infinite',
              }}
            />
          </div>
        )}
      </div>
      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
} 