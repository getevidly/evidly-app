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

const NAVY = '#1E2D4D';
const GOLD = '#A08C5A';
const TEXT = '#374151';
const TEXT_SEC = '#6B7280';
const BORDER = '#E5E7EB';
const CARD = 'background: #fff; border: 1px solid #E5E7EB; border-radius: 8px;';

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 style={{ fontSize: 16, fontWeight: 700, color: NAVY, marginBottom: 12, marginTop: 32 }}>
      {title}
    </h2>
  );
}

function Card({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 16 }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}` }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{title}</h3>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  const bgMap: Record<string, string> = {
    green: '#dcfce7', red: '#fef2f2', amber: '#fffbeb', gray: '#f3f4f6', blue: '#eff6ff',
  };
  const fgMap: Record<string, string> = {
    green: '#16a34a', red: '#dc2626', amber: '#d97706', gray: '#6b7280', blue: '#2563eb',
  };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
      backgroundColor: bgMap[color] || bgMap.gray,
      color: fgMap[color] || fgMap.gray,
    }}>
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
      <div style={{ maxWidth: 900 }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY }}>Demo Data Dashboard</h1>
          <p style={{ fontSize: 13, color: TEXT_SEC, marginTop: 4 }}>
            Visual reference of all hardcoded demo constants used in demo mode.
          </p>
        </div>

        {/* ── Org Overview ── */}
        <SectionTitle title="Organization" />
        <Card title="DEMO_ORG">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600 }}>Name</div>
              <div style={{ fontSize: 14, color: TEXT, fontWeight: 500 }}>{DEMO_ORG.name}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600 }}>Locations</div>
              <div style={{ fontSize: 14, color: TEXT, fontWeight: 500 }}>{DEMO_ORG.locationCount}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600 }}>Industry</div>
              <div style={{ fontSize: 14, color: TEXT, fontWeight: 500 }}>{DEMO_ORG.industry_type}</div>
            </div>
          </div>
        </Card>

        <Card title="Org-Level Scores (DEMO_ORG_SCORES)">
          <div style={{ display: 'flex', gap: 32 }}>
            <div>
              <div style={{ fontSize: 11, color: TEXT_SEC }}>Food Safety Avg</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: NAVY }}>{DEMO_ORG_SCORES.foodSafety}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: TEXT_SEC }}>Facility Safety Avg</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: NAVY }}>{DEMO_ORG_SCORES.facilitySafety}</div>
            </div>
          </div>
        </Card>

        {/* ── Roles ── */}
        <SectionTitle title="Demo Users (per role)" />
        <Card title="demoUsers">
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: TEXT_SEC, fontSize: 11 }}>Role</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: TEXT_SEC, fontSize: 11 }}>Name</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: TEXT_SEC, fontSize: 11 }}>Title</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(demoUsers).map(([role, user]) => (
                <tr key={role} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontSize: 12 }}>{role}</td>
                  <td style={{ padding: '6px 8px' }}>{user.name}</td>
                  <td style={{ padding: '6px 8px', color: TEXT_SEC }}>{user.title}</td>
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
              <div key={loc.id} style={{
                padding: '12px 0',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>
                    {loc.name} <span style={{ fontSize: 12, color: TEXT_SEC }}>({loc.id})</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
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
                  <div style={{ textAlign: 'right', fontSize: 12, color: TEXT_SEC }}>
                    <div>Food: {scores.foodScore}</div>
                    <div>Facility: {scores.fireScore}</div>
                    <div style={{ color: loc.trend > 0 ? '#16a34a' : loc.trend < 0 ? '#dc2626' : TEXT_SEC }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {[
              { label: 'Temp Checks', value: DEMO_WEEKLY_ACTIVITY.tempChecks.total, sub: `${DEMO_WEEKLY_ACTIVITY.tempChecks.onTimePercent}% on time` },
              { label: 'Checklists', value: `${DEMO_WEEKLY_ACTIVITY.checklists.completed}/${DEMO_WEEKLY_ACTIVITY.checklists.required}`, sub: `${DEMO_WEEKLY_ACTIVITY.checklists.percent}%` },
              { label: 'Docs Uploaded', value: DEMO_WEEKLY_ACTIVITY.documents.uploaded, sub: `${DEMO_WEEKLY_ACTIVITY.documents.expiringSoon} expiring` },
              { label: 'Incidents', value: DEMO_WEEKLY_ACTIVITY.incidents.total, sub: `${DEMO_WEEKLY_ACTIVITY.incidents.open} open` },
              { label: 'Active Team', value: DEMO_WEEKLY_ACTIVITY.activeTeam, sub: 'members' },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: NAVY }}>{item.value}</div>
                <div style={{ fontSize: 11, color: TEXT_SEC, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 10, color: TEXT_SEC }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Attention Items ── */}
        <SectionTitle title="Attention Items" />
        <Card title={`DEMO_ATTENTION_ITEMS (${DEMO_ATTENTION_ITEMS.length})`}>
          {DEMO_ATTENTION_ITEMS.map((item, i) => (
            <div key={i} style={{
              padding: '8px 0',
              borderBottom: i < DEMO_ATTENTION_ITEMS.length - 1 ? `1px solid ${BORDER}` : 'none',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <Badge color={item.status === 'critical' ? 'red' : 'amber'} label={item.status} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{item.locationName}</div>
                <div style={{ fontSize: 12, color: TEXT_SEC }}>{item.summary}</div>
              </div>
              <div style={{ fontSize: 11, color: GOLD, fontWeight: 600 }}>{item.action}</div>
            </div>
          ))}
        </Card>

        <Card title={`needsAttentionItems (${needsAttentionItems.length})`}>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {needsAttentionItems.map(item => (
              <div key={item.id} style={{
                padding: '6px 0',
                borderBottom: `1px solid ${BORDER}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <Badge color={item.color} label={item.color} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: TEXT }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: TEXT_SEC }}>{item.detail}</div>
                </div>
                <div style={{ fontSize: 10, color: TEXT_SEC, fontFamily: 'monospace' }}>{item.url}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Vendors ── */}
        <SectionTitle title="Vendors" />
        <Card title={`vendors (${vendors.length})`}>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}`, position: 'sticky', top: 0, background: '#fff' }}>
                  {['Company', 'Service', 'Status', 'Next Due', 'Loc'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '4px 6px', color: TEXT_SEC, fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendors.map(v => (
                  <tr key={v.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td style={{ padding: '4px 6px' }}>{v.companyName}</td>
                    <td style={{ padding: '4px 6px' }}>{v.serviceType}</td>
                    <td style={{ padding: '4px 6px' }}>
                      <Badge
                        color={v.status === 'current' ? 'green' : v.status === 'overdue' ? 'red' : 'amber'}
                        label={v.status}
                      />
                    </td>
                    <td style={{ padding: '4px 6px', fontFamily: 'monospace' }}>{v.nextDue || '—'}</td>
                    <td style={{ padding: '4px 6px' }}>L{v.locationId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── Vendor Services ── */}
        <SectionTitle title="Vendor Services" />
        <Card title="Vendor Service Records">
          <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: TEXT_SEC }}>
            Service records will appear here once HoodOps completes work at this location.
          </div>
        </Card>

        {/* ── Trend Data ── */}
        <SectionTitle title="30-Day Trend" />
        <Card title={`DEMO_TREND_DATA (${DEMO_TREND_DATA.length} points)`}>
          <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#16a34a', fontWeight: 600 }}>Food Safety</span>: {DEMO_TREND_DATA[0].foodSafety} → {DEMO_TREND_DATA[DEMO_TREND_DATA.length - 1].foodSafety}
            </div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#2563eb', fontWeight: 600 }}>Facility Safety</span>: {DEMO_TREND_DATA[0].facilitySafety} → {DEMO_TREND_DATA[DEMO_TREND_DATA.length - 1].facilitySafety}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
            {DEMO_TREND_DATA.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <div
                  style={{
                    height: Math.max(2, (d.foodSafety - 60) * 2),
                    backgroundColor: '#16a34a',
                    borderRadius: 1,
                    opacity: 0.6,
                  }}
                  title={`${d.date}: Food ${d.foodSafety}`}
                />
                <div
                  style={{
                    height: Math.max(2, (d.facilitySafety - 60) * 2),
                    backgroundColor: '#2563eb',
                    borderRadius: 1,
                    opacity: 0.6,
                  }}
                  title={`${d.date}: Facility ${d.facilitySafety}`}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: TEXT_SEC }}>
            <span>{DEMO_TREND_DATA[0].date}</span>
            <span>{DEMO_TREND_DATA[DEMO_TREND_DATA.length - 1].date}</span>
          </div>
        </Card>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 16, borderTop: `1px solid ${BORDER}`, fontSize: 12, color: TEXT_SEC }}>
          Data sources: <code>src/data/demoData.ts</code>
        </div>
      </div>
  );
}
