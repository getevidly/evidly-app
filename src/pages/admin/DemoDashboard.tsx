/**
 * DemoDashboard — Admin-only visual showcase of all demo data constants
 *
 * Standalone page at /admin/demo/dashboard. Uses demo constants
 * from demoData.ts. This is a visual reference for what the demo
 * mode shows — all hardcoded, no Supabase queries.
 */
import {
  DEMO_ORG,
  DEMO_LOCATIONS,
  LOCATIONS_WITH_SCORES,
  DEMO_ORG_SCORES,
  DEMO_ATTENTION_ITEMS,
  DEMO_WEEKLY_ACTIVITY,
  DEMO_TREND_DATA,
  LOCATION_JURISDICTION_STATUS,
  vendors,
  needsAttentionItems,
  demoUsers,
} from '../../data/demoData';
import { useDemoGuard } from '../../hooks/useDemoGuard';

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-base font-bold text-navy mb-3 mt-8">
      {title}
    </h2>
  );
}

function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4">
      <div className="py-3 px-4 border-b border-gray-200">
        <h3 className="text-[13px] font-semibold text-navy">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  const bgMap: Record<string, string> = {
    green: 'bg-green-100', red: 'bg-red-50', amber: 'bg-amber-50', gray: 'bg-gray-100', blue: 'bg-blue-50',
  };
  const fgMap: Record<string, string> = {
    green: 'text-green-600', red: 'text-red-600', amber: 'text-amber-600', gray: 'text-gray-500', blue: 'text-blue-600',
  };
  return (
    <span className={`text-[11px] font-semibold py-0.5 px-2 rounded ${bgMap[color] || bgMap.gray} ${fgMap[color] || fgMap.gray}`}>
      {label}
    </span>
  );
}

export default function DemoDashboard() {
  useDemoGuard();
  const statusColor = (s: string) =>
    s === 'passing' || s === 'good' ? 'green' :
    s === 'at_risk' || s === 'attention' ? 'amber' :
    s === 'failing' || s === 'critical' ? 'red' : 'gray';

  return (
      <div className="max-w-[900px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-extrabold text-navy">Demo Data Dashboard</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Visual reference of all hardcoded demo constants used in demo mode.
          </p>
        </div>

        {/* ── Org Overview ── */}
        <SectionTitle title="Organization" />
        <Card title="DEMO_ORG">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] text-gray-500 font-semibold">Name</div>
              <div className="text-sm text-gray-700 font-medium">{DEMO_ORG.name}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-semibold">Locations</div>
              <div className="text-sm text-gray-700 font-medium">{DEMO_ORG.locationCount}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500 font-semibold">Industry</div>
              <div className="text-sm text-gray-700 font-medium">{DEMO_ORG.industry_type}</div>
            </div>
          </div>
        </Card>

        <Card title="Org-Level Scores (DEMO_ORG_SCORES)">
          <div className="flex gap-8">
            <div>
              <div className="text-[11px] text-gray-500">Food Safety Avg</div>
              <div className="text-2xl font-bold text-navy">{DEMO_ORG_SCORES.foodSafety}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-500">Facility Safety Avg</div>
              <div className="text-2xl font-bold text-navy">{DEMO_ORG_SCORES.facilitySafety}</div>
            </div>
          </div>
        </Card>

        {/* ── Roles ── */}
        <SectionTitle title="Demo Users (per role)" />
        <Card title="demoUsers">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-2 text-gray-500 text-[11px]">Role</th>
                <th className="text-left py-1.5 px-2 text-gray-500 text-[11px]">Name</th>
                <th className="text-left py-1.5 px-2 text-gray-500 text-[11px]">Title</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(demoUsers).map(([role, user]) => (
                <tr key={role} className="border-b border-gray-200">
                  <td className="py-1.5 px-2 font-mono text-xs">{role}</td>
                  <td className="py-1.5 px-2">{user.name}</td>
                  <td className="py-1.5 px-2 text-gray-500">{user.title}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* ── Locations ── */}
        <SectionTitle title="Locations" />
        <Card title="DEMO_LOCATIONS + Jurisdiction Status">
          {DEMO_LOCATIONS.map(loc => {
            const jStatus = LOCATION_JURISDICTION_STATUS[loc.id];
            const scores = LOCATIONS_WITH_SCORES.find(l => l.id === loc.id);
            return (
              <div key={loc.id} className="py-3 border-b border-gray-200 flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-700">
                    {loc.name} <span className="text-xs text-gray-500">({loc.id})</span>
                  </div>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge color={statusColor(loc.status)} label={loc.status} />
                    {jStatus && (
                      <>
                        <Badge
                          color={statusColor(jStatus.foodSafety.status)}
                          label={`Food: ${jStatus.foodSafety.gradeDisplay}`}
                        />
                        <Badge
                          color={statusColor(jStatus.facilitySafety.status)}
                          label={`Facility: ${jStatus.facilitySafety.gradeDisplay}`}
                        />
                      </>
                    )}
                  </div>
                </div>
                {scores && (
                  <div className="text-right text-xs text-gray-500">
                    <div>Food: {scores.foodScore}</div>
                    <div>Facility: {scores.fireScore}</div>
                    <div className={loc.trend > 0 ? 'text-green-600' : loc.trend < 0 ? 'text-red-600' : 'text-gray-500'}>
                      Trend: {loc.trend > 0 ? '+' : ''}{loc.trend}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>

        {/* ── Weekly Activity ── */}
        <SectionTitle title="Weekly Activity" />
        <Card title="DEMO_WEEKLY_ACTIVITY">
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Temp Checks', value: DEMO_WEEKLY_ACTIVITY.tempChecks.total, sub: `${DEMO_WEEKLY_ACTIVITY.tempChecks.onTimePercent}% on time` },
              { label: 'Checklists', value: `${DEMO_WEEKLY_ACTIVITY.checklists.completed}/${DEMO_WEEKLY_ACTIVITY.checklists.required}`, sub: `${DEMO_WEEKLY_ACTIVITY.checklists.percent}%` },
              { label: 'Docs Uploaded', value: DEMO_WEEKLY_ACTIVITY.documents.uploaded, sub: `${DEMO_WEEKLY_ACTIVITY.documents.expiringSoon} expiring` },
              { label: 'Incidents', value: DEMO_WEEKLY_ACTIVITY.incidents.total, sub: `${DEMO_WEEKLY_ACTIVITY.incidents.open} open` },
              { label: 'Active Team', value: DEMO_WEEKLY_ACTIVITY.activeTeam, sub: 'members' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="text-xl font-bold text-navy">{item.value}</div>
                <div className="text-[11px] text-gray-500 font-semibold">{item.label}</div>
                <div className="text-[10px] text-gray-500">{item.sub}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Attention Items ── */}
        <SectionTitle title="Attention Items" />
        <Card title={`DEMO_ATTENTION_ITEMS (${DEMO_ATTENTION_ITEMS.length})`}>
          {DEMO_ATTENTION_ITEMS.map((item, i) => (
            <div key={i} className={`py-2 flex items-center gap-3 ${
              i < DEMO_ATTENTION_ITEMS.length - 1 ? 'border-b border-gray-200' : ''
            }`}>
              <Badge color={item.status === 'critical' ? 'red' : 'amber'} label={item.status} />
              <div className="flex-1">
                <div className="text-[13px] font-medium text-gray-700">{item.locationName}</div>
                <div className="text-xs text-gray-500">{item.summary}</div>
              </div>
              <div className="text-[11px] text-gold font-semibold">{item.action}</div>
            </div>
          ))}
        </Card>

        <Card title={`needsAttentionItems (${needsAttentionItems.length})`}>
          <div className="max-h-[300px] overflow-y-auto">
            {needsAttentionItems.map(item => (
              <div key={item.id} className="py-1.5 border-b border-gray-200 flex items-center gap-2.5">
                <Badge color={item.color} label={item.color} />
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-700">{item.title}</div>
                  <div className="text-[11px] text-gray-500">{item.detail}</div>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">{item.url}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Vendors ── */}
        <SectionTitle title="Vendors" />
        <Card title={`vendors (${vendors.length})`}>
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 sticky top-0 bg-white">
                  {['Company', 'Service', 'Status', 'Next Due', 'Loc'].map(h => (
                    <th key={h} className="text-left py-1 px-1.5 text-gray-500 text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id} className="border-b border-gray-200">
                    <td className="py-1 px-1.5">{v.companyName}</td>
                    <td className="py-1 px-1.5">{v.serviceType}</td>
                    <td className="py-1 px-1.5">
                      <Badge
                        color={v.status === 'current' ? 'green' : v.status === 'overdue' ? 'red' : 'amber'}
                        label={v.status}
                      />
                    </td>
                    <td className="py-1 px-1.5 font-mono">{v.nextDue || '—'}</td>
                    <td className="py-1 px-1.5">L{v.locationId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Vendor Services ── */}
        <SectionTitle title="Vendor Services" />
        <Card title="Vendor Service Records">
          <div className="p-5 text-center text-[13px] text-gray-500">
            Service records will appear here once HoodOps completes work at this location.
          </div>
        </Card>

        {/* ── Trend Data ── */}
        <SectionTitle title="30-Day Trend" />
        <Card title={`DEMO_TREND_DATA (${DEMO_TREND_DATA.length} points)`}>
          <div className="flex gap-6 mb-3">
            <div className="text-xs">
              <span className="text-green-600 font-semibold">Food Safety</span>: {DEMO_TREND_DATA[0].foodSafety} → {DEMO_TREND_DATA[DEMO_TREND_DATA.length - 1].foodSafety}
            </div>
            <div className="text-xs">
              <span className="text-blue-600 font-semibold">Facility Safety</span>: {DEMO_TREND_DATA[0].facilitySafety} → {DEMO_TREND_DATA[DEMO_TREND_DATA.length - 1].facilitySafety}
            </div>
          </div>
          <div className="flex items-end gap-0.5 h-20">
            {DEMO_TREND_DATA.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col gap-px">
                <div
                  className="bg-green-600 rounded-sm opacity-60"
                  style={{ height: Math.max(2, (d.foodSafety - 60) * 2) }}
                  title={`${d.date}: Food ${d.foodSafety}`}
                />
                <div
                  className="bg-blue-600 rounded-sm opacity-60"
                  style={{ height: Math.max(2, (d.facilitySafety - 60) * 2) }}
                  title={`${d.date}: Facility ${d.facilitySafety}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-gray-500">
            <span>{DEMO_TREND_DATA[0].date}</span>
            <span>{DEMO_TREND_DATA[DEMO_TREND_DATA.length - 1].date}</span>
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-10 pt-4 border-t border-gray-200 text-xs text-gray-500">
          Data sources: <code>src/data/demoData.ts</code>
        </div>
      </div>
  );
}
