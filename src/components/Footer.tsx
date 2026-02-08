export default function Footer() {
  return (
    <footer className="py-10 px-6 bg-[var(--color-blue)] border-t border-[rgba(255,255,255,0.1)]">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between flex-wrap gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-9">
            <svg viewBox="0 0 56 65" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M28 0L56 10V28C56 47.33 44.12 58.17 28 65C11.88 58.17 0 47.33 0 28V10L28 0Z" fill="#d4af37"/>
              <path d="M28 6L50 14V28C50 43.5 40.5 52.5 28 58C15.5 52.5 6 43.5 6 28V14L28 6Z" fill="#1e4d6b"/>
              <path d="M22 32L26 36L34 26" stroke="#d4af37" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-['Outfit'] text-[1.25rem] font-bold tracking-tight">
            <span className="text-white">Evid</span>
            <span className="text-[var(--color-gold)]">LY</span>
          </span>
        </div>
        <div className="text-[0.875rem] text-[rgba(255,255,255,0.6)]">
          © 2026 EvidLY. Compliance Simplified. | <a href="mailto:launch@getevidly.com" className="text-[rgba(255,255,255,0.6)] hover:text-white">launch@getevidly.com</a>
        </div>
        <div className="flex gap-6">
          <a href="#" className="text-[0.875rem] text-[rgba(255,255,255,0.6)] no-underline transition-colors hover:text-white">Privacy</a>
          <a href="#" className="text-[0.875rem] text-[rgba(255,255,255,0.6)] no-underline transition-colors hover:text-white">Terms</a>
          <a href="mailto:launch@getevidly.com" className="text-[0.875rem] text-[rgba(255,255,255,0.6)] no-underline transition-colors hover:text-white">Contact</a>
        </div>
      </div>
    </footer>
  );
}
