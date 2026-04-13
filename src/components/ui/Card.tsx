interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  noPadding?: boolean;
  action?: React.ReactNode;
}

export function Card({ children, title, className = '', noPadding, action }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#1E2D4D]/10 ${noPadding ? '' : 'p-4 sm:p-5'} ${className}`}
    >
      {title && (
        <div className={`flex justify-between items-center text-base font-semibold text-[#1E2D4D] mb-4 pb-3 border-b border-[#1E2D4D]/5 ${noPadding ? 'px-5 pt-4' : ''}`}>
          <span>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
