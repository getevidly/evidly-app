export default function VendorNetworkPlaceholder() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Page header */}
      <div className="px-4 pt-5 pb-3">
        <p
          className="uppercase tracking-wider mb-1"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#A08C5A' }}
        >
          Vendor network
        </p>
        <h1
          className="leading-tight"
          style={{ fontSize: '22px', fontWeight: 500, color: '#1E2D4D' }}
        >
          Vendor Network
        </h1>
      </div>

      {/* Explainer card */}
      <div className="px-4 pb-24">
        <div
          className="bg-white rounded-lg px-4 py-4"
          style={{ border: '1px solid #E2DDD4' }}
        >
          <p style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
            Vendor Network is the directory of pre-vetted commercial kitchen
            service vendors that kitchen leaders can hire from with confidence.
          </p>
          <p className="mt-3.5" style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
            Every vendor in the directory has been screened — insurance current,
            IKECA and NFPA certifications verified, jurisdiction-specific
            credentials confirmed, references checked. When you need a hood
            cleaner in Fresno, a pest control partner in Stockton, or a grease
            collection vendor anywhere in California, this is where you'll find
            them. No cold-calling. No license verification. No wondering whether
            they'll show up.
          </p>
          <p className="mt-3.5" style={{ fontSize: '15px', color: '#1E2D4D', lineHeight: '1.6' }}>
            We're opening the directory in waves. Founder customers get early
            access — we'll notify you when the first wave is live in your region.
          </p>
        </div>
      </div>
    </div>
  );
}
