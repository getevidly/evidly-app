import { HandHeart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function K2CPricingBadge() {
  return (
    <div
      className="max-w-3xl mx-auto mt-8 rounded-xl px-5 py-4 flex items-center gap-4"
      style={{ backgroundColor: '#FDF6E3', border: '1px solid rgba(160,140,90,0.3)' }}
    >
      <HandHeart className="w-8 h-8 flex-shrink-0" style={{ color: '#A08C5A' }} />
      <div>
        <p className="text-sm font-semibold" style={{ color: '#1E2D4D' }}>
          Kitchen to Community
        </p>
        <p className="text-sm mt-0.5" style={{ color: '#5D4E37' }}>
          Your subscription funds ~100 meals/month for kids in need.{' '}
          <Link
            to="/kitchen-to-community"
            className="font-semibold hover:underline"
            style={{ color: '#A08C5A' }}
          >
            Learn more &rarr;
          </Link>
        </p>
      </div>
    </div>
  );
}
