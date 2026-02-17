import { Link } from 'react-router-dom';
import { Radio, ArrowLeft } from 'lucide-react';

export function IoTMonitoring() {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div
        className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-6"
        style={{ backgroundColor: '#eef4f8' }}
      >
        <Radio className="w-8 h-8" style={{ color: '#1e4d6b' }} />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        IoT Monitoring — Coming Soon
      </h1>

      <p className="text-gray-600 mb-8 leading-relaxed">
        Real-time temperature monitoring from connected sensors. View live readings,
        set alert thresholds, and auto-log temperatures to your compliance records.
      </p>

      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: '#1e4d6b' }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2a6a8f')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1e4d6b')}
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>
    </div>
  );
}
