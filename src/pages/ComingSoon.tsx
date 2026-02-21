import { useNavigate } from 'react-router-dom';

interface ComingSoonProps {
  title: string;
  description?: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '48px 24px', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '40px 32px',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          background: '#eef4f8',
          border: '1px solid #b8d4e8',
          borderRadius: 20,
          padding: '4px 14px',
          fontSize: 11,
          fontWeight: 700,
          color: '#1e4d6b',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          marginBottom: 16,
        }}>
          Coming Soon
        </div>

        <h1 style={{
          fontSize: 22,
          fontWeight: 800,
          color: '#1e4d6b',
          margin: '0 0 8px',
        }}>
          {title}
        </h1>

        {description && (
          <p style={{
            fontSize: 14,
            color: '#6b7280',
            margin: '0 0 24px',
            lineHeight: 1.6,
          }}>
            {description}
          </p>
        )}

        <button
          onClick={() => navigate(-1)}
          style={{
            background: '#1e4d6b',
            color: '#ffffff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'system-ui',
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}
