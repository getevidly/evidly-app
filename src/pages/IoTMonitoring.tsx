import React from 'react';

const IoTMonitoring = () => (
  <div style={{ padding: '32px', fontFamily: 'DM Sans, sans-serif' }}>
    <h1 style={{ color: '#1A237E', fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
      📡 IoT Monitoring
    </h1>
    <p style={{ color: '#4A4E69' }}>
      Real-time temperature monitoring from connected sensors. View live readings, set alert
      thresholds, and auto-log temperatures to your compliance records.
    </p>
    <div
      style={{
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#FFF8E1',
        borderRadius: '8px',
        border: '1px solid #B8860B',
      }}
    >
      <strong style={{ color: '#B8860B' }}>Coming Soon</strong>
      <p style={{ color: '#4A4E69', margin: '8px 0 0' }}>
        IoT sensor integration is in development. Manual temp logging and QR scan entry are
        available now.
      </p>
    </div>
  </div>
);

export default IoTMonitoring;
