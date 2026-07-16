import React, { useState } from 'react';
import { EvidLYDashboard, LOC_TABS } from '../components/join/EvidLYDashboard';

const NAVY = '#1C2A3A';
const GOLD = '#A08C5A';
const BG   = '#EFE8DA';

export function DemoDashboard() {
  const [loc, setLoc]         = useState('all');
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => setCollapsed(false)}
          style={{
            fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 16,
            background: NAVY, color: '#fff', border: 'none', borderRadius: 12,
            padding: '14px 28px', cursor: 'pointer', boxShadow: '0 4px 24px rgba(28,42,58,.25)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
        >
          <span><span style={{ color: GOLD }}>E</span>vid<span style={{ color: GOLD }}>LY</span></span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '.08em', opacity: .7 }}>
            REOPEN DEMO
          </span>
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3vh 16px' }}>
      <div style={{
        width: '100%', maxWidth: 1060, maxHeight: '94vh', background: '#fff',
        borderRadius: 16, boxShadow: '0 8px 40px rgba(28,42,58,.12), 0 1px 3px rgba(28,42,58,.06)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* ── Header ── */}
        <div style={{
          background: NAVY, padding: '0 20px', minHeight: 54,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0,
        }}>
          {/* Left: wordmark + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: 18, letterSpacing: '-.01em' }}>
              <span style={{ color: GOLD }}>E</span><span style={{ color: '#fff' }}>vid</span><span style={{ color: GOLD }}>LY</span>
            </span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '.12em',
              color: 'rgba(255,255,255,.5)', whiteSpace: 'nowrap',
            }}>
              DASHBOARD DEMO
            </span>
          </div>

          {/* Right: tabs + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
            {LOC_TABS.map(([id, label]) => {
              const active = loc === id;
              return (
                <button
                  key={id}
                  onClick={() => setLoc(id)}
                  style={{
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, fontWeight: active ? 600 : 500,
                    cursor: 'pointer', border: 'none', borderRadius: 999, padding: '6px 14px',
                    whiteSpace: 'nowrap', transition: 'background .16s, color .16s',
                    background: active ? GOLD : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,.55)',
                  }}
                >
                  {label}
                </button>
              );
            })}

            <button
              onClick={() => setCollapsed(true)}
              aria-label="Close demo"
              style={{
                background: 'transparent', border: 'none', color: 'rgba(255,255,255,.5)',
                fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: '4px 8px', marginLeft: 4, flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <EvidLYDashboard embedded loc={loc} onLocChange={setLoc} pulse />
        </div>
      </div>

      {/* Hide scrollbar on tabs overflow container */}
      <style>{`
        div::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  );
}
