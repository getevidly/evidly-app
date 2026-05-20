import { useRole } from '../../../contexts/RoleContext';
import type { DashboardRole } from '../../../constants/dashboardComposition';

const PRP_SUBTITLES: Record<string, [string, string, string]> = {
  owner_operator:     ['See what is coming due',      'Cut losses before they hit', 'Evidence on record'],
  executive:          ['Portfolio-wide',               'Cut losses before they hit', 'Evidence on record'],
  compliance_manager: ['Inspection windows',           'Defensible gaps',            'Full evidence trail'],
  facilities_manager: ['Service cycles + lapses',      'Fire risk · service gaps',   'Contracts on file'],
  chef:               ['Food safety drifts',           'Spoilage · violations',      'Logs · photos · sign-offs'],
};

export function PrpHeader() {
  const { userRole } = useRole();
  const role: DashboardRole = userRole === 'platform_admin' ? 'owner_operator' : userRole as DashboardRole;

  const subs = PRP_SUBTITLES[role];
  if (!subs) return null;

  return (
    <div className="prp-row">
      <div className="prp predict">
        <div className="prp-icon"><i className="ti ti-trending-up" /></div>
        <div>
          <p className="prp-label">Predict</p>
          <p className="prp-sub">{subs[0]}</p>
        </div>
      </div>
      <div className="prp reduce">
        <div className="prp-icon"><i className="ti ti-shield-check" /></div>
        <div>
          <p className="prp-label">Reduce</p>
          <p className="prp-sub">{subs[1]}</p>
        </div>
      </div>
      <div className="prp prove">
        <div className="prp-icon"><i className="ti ti-file-check" /></div>
        <div>
          <p className="prp-label">Prove</p>
          <p className="prp-sub">{subs[2]}</p>
        </div>
      </div>
    </div>
  );
}
