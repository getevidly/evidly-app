import type { SectionKey } from '../../../constants/dashboardComposition';

interface SectionStubProps {
  sectionKey: SectionKey;
}

/** Visible placeholder rendered for any section that hasn't been wired yet. */
export function SectionStub({ sectionKey }: SectionStubProps) {
  return (
    <div className="v10-section v10-section-stub">
      <p className="v10-section-label">{sectionKey.replace(/_/g, ' ')}</p>
      <p className="v10-section-placeholder">Section stub — will be wired in a later commit.</p>
    </div>
  );
}
