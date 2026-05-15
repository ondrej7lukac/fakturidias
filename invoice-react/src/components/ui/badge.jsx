import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'border-white/20 text-foreground',
        success: 'border-emerald-400/30 bg-emerald-400/20 text-emerald-100',
        warning: 'border-amber-400/30 bg-amber-400/20 text-amber-100',
        info: 'border-blue-400/30 bg-blue-400/20 text-blue-100',
        muted: 'border-slate-400/30 bg-slate-400/20 text-slate-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
