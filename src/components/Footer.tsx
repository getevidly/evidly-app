import { EvidlyLogo } from './ui/EvidlyLogo';

export default function Footer() {
  return (
    <footer className="py-12 sm:py-16 px-4 sm:px-6 pb-20 sm:pb-16 bg-[var(--color-blue)] border-t border-[rgba(255,255,255,0.1)]">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center mb-4">
              <EvidlyLogo showTagline={false} />
            </div>
            <p className="text-sm text-[rgba(255,255,255,0.5)] leading-relaxed">
              Answers before you ask.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5">
              <li><button onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0">Features</button></li>
              <li><button onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0">Pricing</button></li>
              <li><button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors bg-transparent border-none cursor-pointer p-0">How It Works</button></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Company</h4>
            <ul className="space-y-2.5">
              <li><a href="mailto:founders@getevidly.com" target="_blank" rel="noopener noreferrer" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors no-underline">About Us</a></li>
              <li><a href="mailto:founders@getevidly.com" target="_blank" rel="noopener noreferrer" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors no-underline">Careers</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
            <ul className="space-y-2.5">
              <li><a href="/privacy" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors no-underline">Privacy Policy</a></li>
              <li><a href="/terms" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors no-underline">Terms of Service</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-2.5">
              <li><a href="mailto:founders@getevidly.com" target="_blank" rel="noopener noreferrer" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors no-underline">founders@getevidly.com</a></li>
              <li><a href="tel:+18553843591" className="text-sm text-[rgba(255,255,255,0.6)] hover:text-white transition-colors no-underline">(855) EVIDLY1</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[rgba(255,255,255,0.1)] pt-8 text-center">
          <p className="text-sm text-[rgba(255,255,255,0.4)]">
            &copy; 2026 EvidLY &mdash; Answers before you ask.
          </p>
        </div>
      </div>
    </footer>
  );
}
