import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';

export default function Navigation() {
  const navigate = useNavigate();
  const { enterDemo } = useDemo();

  const handleTryDemo = () => {
    enterDemo();
    navigate('/dashboard');
  };

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <Shield style={{ color: '#d4af37', width: '32px', height: '32px' }} />
        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
          <span style={{ color: '#1e4d6b' }}>Evid</span>
          <span style={{ color: '#d4af37' }}>LY</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a href="#features" style={{ color: '#4b5563', textDecoration: 'none' }}>Features</a>
        <a href="#pricing" style={{ color: '#4b5563', textDecoration: 'none' }}>Pricing</a>
        <a href="#contact" style={{ color: '#4b5563', textDecoration: 'none' }}>Contact</a>
        <button onClick={handleTryDemo} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#d4af37', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
          ▶ Try Demo
        </button>
        <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', background: 'transparent', color: '#1b4965', border: '1px solid #1b4965', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
          Sign In
        </button>
        <button onClick={() => navigate('/signup')} style={{ padding: '8px 16px', background: '#1b4965', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
          Get Started
        </button>
      </div>
    </nav>
  );
}