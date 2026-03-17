import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h1 style={{ fontSize: 48, fontWeight: 800, color: '#1E2D4D' }}>404</h1>
      <p style={{ fontSize: 18, color: '#4B5563', margin: '16px 0' }}>
        This page doesn't exist.
      </p>
      <Link to="/dashboard" style={{
        color: '#1E2D4D', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px'
      }}>
        Go to Dashboard →
      </Link>
    </div>
  );
}
