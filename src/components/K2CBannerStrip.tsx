import { Link } from 'react-router-dom';

export default function K2CBannerStrip() {
  return (
    <div style={{ backgroundColor: '#FDF6E3' }} className="py-3 px-4">
      <p className="text-center text-sm leading-relaxed" style={{ color: '#5D4E37' }}>
        <span className="mr-1.5">🍽️</span>
        Every EvidLY subscription funds ~100 meals per location per month through No Kid Hungry.
        <Link
          to="/kitchen-to-community"
          className="ml-2 font-semibold hover:underline inline-flex items-center gap-0.5"
          style={{ color: '#A08C5A' }}
        >
          Learn more &rarr;
        </Link>
      </p>
    </div>
  );
}
