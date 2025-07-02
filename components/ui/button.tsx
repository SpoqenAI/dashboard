import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow-primary/50 hover:scale-[1.02] transition-all duration-300',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg',
        outline:
          'border border-input bg-background text-foreground hover:bg-accent/70 hover:border-primary hover:text-accent-foreground hover:shadow-sm transition-all duration-300 hover:scale-[1.02]',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:shadow-glow-secondary/50 hover:scale-[1.02] transition-all duration-300',
        ghost: 'hover:bg-accent/20 hover:text-accent-foreground transition-all duration-300',
        link: 'text-primary underline-offset-4 hover:underline',
        neon: 'bg-gradient-primary text-white font-semibold hover:shadow-glow-primary hover:scale-[1.05] transition-all duration-300 border-0',
        glass: 'bg-card/20 backdrop-blur-glass border border-white/10 text-foreground hover:bg-card/30 hover:shadow-glass transition-all duration-300',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-14 rounded-lg px-10 text-lg',
        icon: 'h-10 w-10 transition-all duration-300 hover:scale-[1.02] hover:shadow-sm hover:bg-accent/20',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
