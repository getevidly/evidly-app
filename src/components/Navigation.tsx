import { Shield, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../contexts/DemoContext';

export default function Navigation() {
  const navigate = useNavigate();
  const { enterDemo } = useDemo();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleTryDemo = () => {
    enterDemo();
    navigate('/dashboard');
  };

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 50, backgroundColor: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => navigate('/')}>
        <Shield style={{ color: '#d4af37', width: '32px', height: '32px' }} />
        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>
          <span style={{ color: '#1e4d6b' }}>Evid</span>
          <span style={{ color: '#d4af37' }}>LY</span>
        </span>
      </div>

      {/* Desktop nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} className="hidden md:flex">
        <a href="#features" style={{ color: '#4b5563', textDecoration: 'none' }}>Features</a>
        <a href="#pricing" style={{ color: '#4b5563', textDecoration: 'none' }}>Pricing</a>
        <a href="#contact" style={{ color: '#4b5563', textDecoration: 'none' }}>Contact</a>
        <button onClick={handleTryDemo} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#d4af37', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
          Try Demo
        </button>
        <button onClick={() => navigate('/login')} style={{ padding: '8px 16px', background: 'transparent', color: '#1e4d6b', border: '1px solid #1e4d6b', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
          Sign In
        </button>
        <button onClick={() => navigate('/signup')} style={{ padding: '8px 16px', background: '#1e4d6b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
          Get Started
        </button>
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="md:hidden"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
      >
        {menuOpen ? <X style={{ width: '28px', height: '28px', color: '#1e4d6b' }} /> : <Menu style={{ width: '28px', height: '28px', color: '#1e4d6b' }} />}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            padding: '16px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 50,
          }}
        >
          <a href="#features" onClick={() => setMenuOpen(false)} style={{ color: '#4b5563', textDecoration: 'none', padding: '8px 0', fontSize: '16px' }}>Features</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} style={{ color: '#4b5563', textDecoration: 'none', padding: '8px 0', fontSize: '16px' }}>Pricing</a>
          <a href="#contact" onClick={() => setMenuOpen(false)} style={{ color: '#4b5563', textDecoration: 'none', padding: '8px 0', fontSize: '16px' }}>Contact</a>
          <button onClick={() => { setMenuOpen(false); handleTryDemo(); }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 16px', background: '#d4af37', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
            Try Demo
          </button>
          <button onClick={() => { setMenuOpen(false); navigate('/login'); }} style={{ padding: '10px 16px', background: 'transparent', color: '#1e4d6b', border: '1px solid #1e4d6b', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
            Sign In
          </button>
          <button onClick={() => { setMenuOpen(false); navigate('/signup'); }} style={{ padding: '10px 16px', background: '#1e4d6b', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
            Get Started
          </button>
        </div>
      )}
    </nav>
  );
}
