import { useNavigate } from 'react-router-dom';
export default function SystemMessages() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: 40 }}>
      <button onClick={() => navigate('/admin')} style={{ marginBottom: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#A08C5A', fontSize: 13 }}>&larr; Admin</button>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1E2D4D' }}>System Messages</h1>
      <p style={{ color: '#8A96A8' }}>Coming soon.</p>
    </div>
  );
}
