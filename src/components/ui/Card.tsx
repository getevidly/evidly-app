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
      className={`bg-white rounded-xl shadow-sm border border-gray-200 ${noPadding ? '' : 'p-4 sm:p-5'} ${className}`}
    >
      {title && (
        <div className={`flex justify-between items-center text-base font-semibold text-[#1e4d6b] mb-4 pb-3 border-b border-gray-100 ${noPadding ? 'px-5 pt-4' : ''}`}>
          <span>{title}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
