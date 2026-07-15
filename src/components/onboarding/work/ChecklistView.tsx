import { useState, useCallback, useMemo } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { SURFACE, TEXT, LINE, FONT, TONE, PILLAR, BRAND } from '../../../design/tokens';
import { useChecklistDocuments } from '../../../hooks/onboarding/useChecklistDocuments';
import type { PillarRequirement } from '../../../hooks/onboarding/usePillarRequirements';
import type { RequirementState } from '../../../hooks/onboarding/useOnboardingState';
import { UploadDocumentModal } from './modals/UploadDocumentModal';
import { toast } from 'sonner';

/* ── Group definitions ─────────────────────────────────── */

const BUSINESS_GRAY = '#8A8578';

interface DocGroup {
  key: string;
  label: string;
  color: string;
  note: string;
  codes: string[];
}

const GROUPS: DocGroup[] = [
  {
    key: 'business',
    label: 'BUSINESS RECORDS',
    color: BUSINESS_GRAY,
    note: 'Permits, certifications, and plans required by your jurisdiction.',
    codes: ['health_permit', 'food_manager_cert', 'food_handler_cards', 'haccp_plan'],
  },
  {
    key: 'fire',
    label: 'FIRE SAFETY',
    color: PILLAR.fire.bar,
    note: 'Inspection and service records for fire protection systems.',
    codes: ['hood_cleaning', 'fire_suppression', 'fire_extinguishers', 'fire_alarm', 'sprinkler_system', 'ahj_inspection'],
  },
  {
    key: 'food',
    label: 'FOOD SAFETY',
    color: PILLAR.food.bar,
    note: 'Operational logs and vendor documentation.',
    codes: ['temperature_logs', 'pest_control'],
  },
  {
    key: 'vendor',
    label: 'VENDOR DOCUMENTS',
    color: BRAND.gold,
    note: 'Certificates of insurance and service agreements from your vendors.',
    codes: [],  // dynamically filled with any remaining codes
  },
];

/* ── Types ─────────────────────────────────────────────── */

type RowStatus = 'uploaded' | 'received' | 'na' | 'pending';

interface ChecklistViewProps {
  requirements: PillarRequirement[];
  pillarItems: RequirementState[];
  skippedItems: string[];
  organizationId: string;
  onSkip: (code: string) => Promise<void>;
  onUnskip: (code: string) => Promise<void>;
  onRefresh: () => void;
}

/* ── Component ─────────────────────────────────────────── */

export function ChecklistView({
  requirements,
  pillarItems,
  skippedItems,
  organizationId,
  onSkip,
  onUnskip,
  onRefresh,
}: ChecklistViewProps) {
  const { docMap, viewDocument } = useChecklistDocuments(organizationId);
  const [uploadReq, setUploadReq] = useState<PillarRequirement | null>(null);

  // Build grouped rows
  const groups = useMemo(() => {
    const knownCodes = new Set(GROUPS.flatMap(g => g.codes));
    const remainingCodes = requirements
      .filter(r => !knownCodes.has(r.requirement_code))
      .map(r => r.requirement_code);

    return GROUPS.map(group => {
      const codes = group.key === 'vendor'
        ? [...group.codes, ...remainingCodes]
        : group.codes;
      const rows = codes
        .map(code => requirements.find(r => r.requirement_code === code))
        .filter((r): r is PillarRequirement => !!r);
      return { ...group, rows };
    }).filter(g => g.rows.length > 0);
  }, [requirements]);

  // Progress
  const totalCount = requirements.length;
  const onFileCount = requirements.filter(r => {
    const doc = docMap[r.requirement_code];
    return !!doc;
  }).length;

  const getRowStatus = useCallback((req: PillarRequirement): RowStatus => {
    if (skippedItems.includes(req.requirement_code)) return 'na';
    const doc = docMap[req.requirement_code];
    if (doc) return 'uploaded';
    // Check if vendor-sourced (received but not yet uploaded by client)
    const stateItem = pillarItems.find(i => i.requirement.requirement_code === req.requirement_code);
    if (stateItem?.status === 'done' && !doc) return 'received';
    return 'pending';
  }, [skippedItems, docMap, pillarItems]);

  const handleToggleNA = useCallback(async (req: PillarRequirement) => {
    if (skippedItems.includes(req.requirement_code)) {
      await onUnskip(req.requirement_code);
    } else {
      await onSkip(req.requirement_code);
    }
    onRefresh();
  }, [skippedItems, onSkip, onUnskip, onRefresh]);

  const handleUploadComplete = useCallback(() => {
    setUploadReq(null);
    onRefresh();
  }, [onRefresh]);

  const progressPct = totalCount > 0 ? (onFileCount / totalCount) * 100 : 0;

  return (
    <div style={{ background: SURFACE.page, minHeight: '100vh' }}>
      {/* ── Branded header bar ── */}
      <div style={{
        background: TEXT.ink,
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: '-0.02em',
          }}>
            <span style={{ color: BRAND.wordmark }}>E</span>
            <span style={{ color: '#FFFFFF' }}>vid</span>
            <span style={{ color: BRAND.wordmark }}>LY</span>
          </span>
        </div>
        <span style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          color: TEXT.onDark,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          Your records
        </span>
      </div>

      {/* ── Main card ── */}
      <div style={{
        maxWidth: 600,
        margin: '24px auto',
        padding: '0 16px',
      }}>
        <div style={{
          background: SURFACE.paper,
          borderRadius: 12,
          border: `1px solid ${LINE.soft}`,
          overflow: 'hidden',
        }}>
          {/* Title + progress */}
          <div style={{ padding: '24px 24px 20px' }}>
            <h1 style={{
              fontFamily: FONT.display,
              fontSize: 22,
              fontWeight: 500,
              color: TEXT.ink,
              margin: 0,
              lineHeight: 1.3,
            }}>
              Your records are coming together
            </h1>
            <div style={{ marginTop: 14 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 6,
              }}>
                <span style={{
                  fontFamily: FONT.mono,
                  fontSize: 11,
                  color: TEXT.meta,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {onFileCount} of {totalCount} on file
                </span>
              </div>
              <div style={{
                height: 6,
                borderRadius: 3,
                background: SURFACE.rail,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  borderRadius: 3,
                  background: TONE.sage.fill,
                  width: `${progressPct}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Groups */}
          {groups.map(group => (
            <div key={group.key}>
              {/* Group header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 24px 4px',
                borderTop: `1px solid ${LINE.soft}`,
              }}>
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: group.color,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: FONT.mono,
                  fontSize: 10,
                  fontWeight: 600,
                  color: TEXT.meta,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {group.label}
                </span>
              </div>
              <div style={{
                padding: '0 24px 6px 42px',
              }}>
                <span style={{
                  fontFamily: FONT.body,
                  fontSize: 11,
                  color: TEXT.muted,
                }}>
                  {group.note}
                </span>
              </div>

              {/* Rows */}
              {group.rows.map(req => (
                <ChecklistRow
                  key={req.requirement_code}
                  requirement={req}
                  status={getRowStatus(req)}
                  doc={docMap[req.requirement_code] || null}
                  onView={(path) => viewDocument(path)}
                  onToggleNA={() => handleToggleNA(req)}
                  onUpload={() => setUploadReq(req)}
                />
              ))}
            </div>
          ))}

          {/* Add a document */}
          <div style={{ padding: '16px 24px 20px', borderTop: `1px solid ${LINE.soft}` }}>
            <button
              type="button"
              onClick={() => {
                // Open upload for the first pending requirement
                const pending = requirements.find(r => getRowStatus(r) === 'pending');
                if (pending) setUploadReq(pending);
                else toast.info('All documents are on file or marked N/A.');
              }}
              style={{
                width: '100%',
                padding: '14px',
                border: `2px dashed ${LINE.strong}`,
                borderRadius: 8,
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Plus size={14} color={TEXT.muted} />
              <span style={{
                fontFamily: FONT.body,
                fontSize: 13,
                fontWeight: 500,
                color: TEXT.muted,
              }}>
                Add a document
              </span>
            </button>
          </div>
        </div>

        {/* Contact footer */}
        <div style={{
          textAlign: 'center',
          padding: '20px 0 32px',
        }}>
          <p style={{
            fontFamily: FONT.body,
            fontSize: 11,
            color: TEXT.muted,
            margin: 0,
            lineHeight: 1.7,
          }}>
            Questions? Reach us at{' '}
            <a href="mailto:founders@getevidly.com" style={{ color: TEXT.ink, textDecoration: 'underline' }}>
              founders@getevidly.com
            </a>
          </p>
          <p style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            color: TEXT.meta,
            margin: '4px 0 0',
          }}>
            (855) 384-3591 ext 1 &middot; getevidly.com
          </p>
        </div>
      </div>

      {/* Upload modal */}
      {uploadReq && (
        <UploadDocumentModal
          isOpen
          onClose={() => setUploadReq(null)}
          requirement={uploadReq}
          organizationId={organizationId}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  );
}

/* ── Row component ─────────────────────────────────────── */

interface ChecklistRowProps {
  requirement: PillarRequirement;
  status: RowStatus;
  doc: { name: string; storagePath: string; createdAt: string; expiryDate: string | null; vendorName: string | null } | null;
  onView: (path: string) => void;
  onToggleNA: () => void;
  onUpload: () => void;
}

function ChecklistRow({ requirement, status, doc, onView, onToggleNA, onUpload }: ChecklistRowProps) {
  // Circle indicator
  const circleSize = 26;
  let circleBg = 'transparent';
  let circleBorder = LINE.strong;
  let circleContent: React.ReactNode = null;

  if (status === 'uploaded') {
    circleBg = TONE.sage.fill;
    circleBorder = TONE.sage.fill;
    circleContent = <Check size={14} color="#fff" strokeWidth={2.5} />;
  } else if (status === 'received') {
    circleBg = TONE.amber.tint;
    circleBorder = TONE.amber.fill;
    circleContent = (
      <span style={{ fontSize: 10, color: TONE.amber.text, fontWeight: 700, letterSpacing: 1 }}>
        ···
      </span>
    );
  } else if (status === 'na') {
    circleBg = SURFACE.rail;
    circleBorder = SURFACE.rail;
    circleContent = <Minus size={12} color={TEXT.muted} strokeWidth={2} />;
  }
  // pending: empty circle (defaults above)

  // Subtitle line
  let subtitle = '';
  if (status === 'uploaded' && doc) {
    const ago = formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true });
    const expiry = doc.expiryDate ? ` · Expires ${format(new Date(doc.expiryDate), 'MMM d, yyyy')}` : '';
    subtitle = `Uploaded ${ago}${expiry}`;
  } else if (status === 'received' && doc?.vendorName) {
    subtitle = `From ${doc.vendorName}`;
  }

  // Action badge
  let badge: React.ReactNode = null;
  if (status === 'uploaded' && doc?.storagePath) {
    badge = (
      <button
        type="button"
        onClick={() => onView(doc.storagePath)}
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          fontWeight: 600,
          color: TONE.sage.text,
          background: TONE.sage.tint,
          border: `1px solid ${TONE.sage.fill}40`,
          borderRadius: 4,
          padding: '3px 10px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        View
      </button>
    );
  } else if (status === 'received') {
    badge = (
      <span style={{
        fontFamily: FONT.mono,
        fontSize: 10,
        fontWeight: 600,
        color: TONE.amber.text,
        background: TONE.amber.tint,
        borderRadius: 4,
        padding: '3px 10px',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}>
        Filing
      </span>
    );
  } else if (status === 'na') {
    badge = (
      <button
        type="button"
        onClick={onToggleNA}
        style={{
          fontFamily: FONT.mono,
          fontSize: 10,
          fontWeight: 600,
          color: TEXT.muted,
          background: SURFACE.rail,
          border: 'none',
          borderRadius: 4,
          padding: '3px 10px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        N/A
      </button>
    );
  } else if (status === 'pending') {
    badge = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={onUpload}
          style={{
            fontFamily: FONT.mono,
            fontSize: 10,
            fontWeight: 600,
            color: TONE.amber.text,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: 0,
          }}
        >
          Needed
        </button>
        <button
          type="button"
          onClick={onToggleNA}
          style={{
            fontFamily: FONT.mono,
            fontSize: 9,
            color: TEXT.meta,
            background: 'transparent',
            border: `1px solid ${LINE.soft}`,
            borderRadius: 3,
            padding: '2px 6px',
            cursor: 'pointer',
          }}
        >
          N/A
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 24px',
      borderTop: `1px solid ${SURFACE.rail}`,
    }}>
      {/* Circle indicator */}
      <div style={{
        width: circleSize,
        height: circleSize,
        borderRadius: '50%',
        background: circleBg,
        border: `2px solid ${circleBorder}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {circleContent}
      </div>

      {/* Name + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT.body,
          fontSize: 14,
          fontWeight: 600,
          color: status === 'na' ? TEXT.muted : TEXT.ink,
          textDecoration: status === 'na' ? 'line-through' : 'none',
          lineHeight: 1.3,
        }}>
          {requirement.label}
        </div>
        {subtitle && (
          <div style={{
            fontFamily: FONT.body,
            fontSize: 12,
            color: TEXT.meta,
            marginTop: 1,
          }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Badge */}
      <div style={{ flexShrink: 0 }}>
        {badge}
      </div>
    </div>
  );
}
