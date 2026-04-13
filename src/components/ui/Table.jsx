export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-xl border border-navy/10 ${className}`}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHeader({ children }) {
  return (
    <thead className="bg-cream border-b border-navy/10">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeaderCell({ children, className = '' }) {
  return (
    <th
      className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-navy/40 ${className}`}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-navy/5">{children}</tbody>;
}

export function TableRow({ children, className = '', onClick }) {
  return (
    <tr
      className={`hover:bg-cream transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '' }) {
  return <td className={`px-4 py-3 text-navy ${className}`}>{children}</td>;
}
