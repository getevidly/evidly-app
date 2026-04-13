import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';

const variants = {
  primary: 'bg-[#1E2D4D] text-white hover:bg-[#2A3F6B] active:scale-[0.98]',
  gold: 'bg-[#A08C5A] text-white hover:bg-[#8B7A4E] active:scale-[0.98]',
  secondary: 'border border-[#1E2D4D]/20 text-[#1E2D4D] hover:bg-[#FAF7F0] active:scale-[0.98]',
  destructive: 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]',
  ghost: 'text-[#1E2D4D] hover:bg-[#1E2D4D]/5 active:scale-[0.98]',
  outline: 'border border-[#A08C5A]/30 text-[#A08C5A] hover:bg-[#A08C5A]/5 active:scale-[0.98]',
};

const sizes = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm min-h-[44px]',
  lg: 'h-12 px-6 text-base min-h-[44px]',
  icon: 'h-10 w-10 min-h-[44px] min-w-[44px]',
};

const Button = forwardRef(({ variant = 'primary', size = 'md', isLoading, disabled, children, className = '', type = 'button', ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    disabled={disabled || isLoading}
    className={`inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#A08C5A]/50 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
    {...props}
  >
    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /><span>Loading...</span></> : children}
  </button>
));

Button.displayName = 'Button';
export default Button;
