import { useNavigate } from 'react-router-dom';

export default function ServicesPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2" style={{ color: '#1E2D4F' }}>Services</h1>
      <p className="text-gray-500 mb-6">
        Log and track service records for hood cleaning, HVAC, pest control, fire suppression,
        and other vendor-provided services across your locations.
      </p>

      {/* Empty state — no vendors yet */}
      <div
        className="rounded-lg p-8 text-center"
        style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
      >
        <p className="text-sm text-gray-600 mb-1 font-medium">No vendors added yet.</p>
        <p className="text-sm text-gray-400 mb-4">
          Add a vendor under Administration &rarr; Vendors before logging services.
        </p>
        <button
          type="button"
          onClick={() => navigate('/vendors')}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#1e4d6b' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2a6a8f'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1e4d6b'; }}
        >
          Add Vendor &rarr;
        </button>
      </div>
    </div>
  );
}
