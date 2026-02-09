import { Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';

export default function QRFeature() {
  const benefits = [
    'Temperature logs for the past 90 days',
    'All vendor certificates and inspection reports',
    'Completed checklists and corrective actions',
    'Real-time compliance operations score'
  ];

  const demoUrl = `${window.location.origin}/passport/demo`;

  return (
    <section className="py-[100px] px-6 bg-gradient-to-br from-[var(--color-blue)] to-[var(--color-blue-dark)] text-white">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div>
          <h2 className="font-['Outfit'] text-[2.75rem] font-bold mb-5">
            Your <span className="text-[var(--color-gold)]">QR Compliance Operations Passport</span>
          </h2>
          <p className="text-[1.2rem] text-[rgba(255,255,255,0.8)] leading-[1.7] mb-8">
            Every location gets a unique QR code. When the health inspector arrives, hand them your phone or let them scan the code on your wall. Instant access to your complete compliance operations status — no scrambling, no searching, no stress.
          </p>
          <ul className="list-none">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3 py-3 text-[1.05rem]">
                <Check className="w-6 h-6 text-[var(--color-gold)]" strokeWidth={2.5} />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[rgba(255,255,255,0.08)] rounded-[24px] p-12 text-center">
          <Link
            to="/passport/demo"
            className="block w-[240px] h-[240px] bg-white rounded-2xl mx-auto mb-6 p-5 hover:scale-105 transition-transform cursor-pointer"
          >
            <QRCodeSVG
              value={demoUrl}
              size={200}
              level="H"
              includeMargin={false}
            />
          </Link>
          <p className="text-[rgba(255,255,255,0.9)] text-[1.05rem] font-medium">
            Try it — scan this code or click to see a live example
          </p>
        </div>
      </div>
    </section>
  );
}
