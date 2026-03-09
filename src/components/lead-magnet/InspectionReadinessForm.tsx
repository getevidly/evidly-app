// STUB — replace with full implementation via PROMPT-IRR-LEAD-MAGNET-01.md

interface Props {
  sourcePage?: string;
  cityName?: string;
  citySlug?: string;
  countyName?: string;
  onClose?: () => void;
  onComplete?: (id: string) => void;
}

export default function InspectionReadinessForm({ onClose }: Props) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(10,10,20,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "40px 32px",
        maxWidth: 480, width: "100%", textAlign: "center",
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}>
        <div style={{ fontWeight: 800, fontSize: "1rem", color: "#1E2D4D", marginBottom: 12 }}>
          Free Operations Check — Coming Soon
        </div>
        <p style={{ fontSize: "0.84rem", color: "#78716c", marginBottom: 24 }}>
          Full form launching with IRR-LEAD-MAGNET-01.
        </p>
        <button
          onClick={onClose}
          style={{
            background: "#1E2D4D", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 24px", cursor: "pointer",
            fontSize: "0.84rem", fontWeight: 700,
            fontFamily: "system-ui,-apple-system,sans-serif",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
