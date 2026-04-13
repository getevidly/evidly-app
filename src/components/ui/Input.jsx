import { forwardRef } from 'react';

const Input = forwardRef(({ label, error, helperText, className = '', id, ...props }, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-navy/80 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`h-10 w-full px-3 text-sm text-navy bg-white border ${
          error ? 'border-red-400' : 'border-navy/15'
        } rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:border-gold disabled:opacity-60 disabled:cursor-not-allowed placeholder:text-navy/30 ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-navy/50">{helperText}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
