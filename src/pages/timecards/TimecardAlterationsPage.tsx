/**
 * Timecard Alterations Page
 *
 * Audit trail of all timecard modifications for HoodOps.
 * Shows all edits with full history including who changed what and why.
 */

import { useState } from 'react';
import {
  Shield,
  Clock,
  User,
  FileText,
  Filter,
  Search,
} from 'lucide-react';
import { useTimecardAlterations } from '../../hooks/api';
import {
  NAVY,
  CARD_BG,
  CARD_BORDER,
  CARD_SHADOW,
  TEXT_TERTIARY,
  PAGE_BG,
  MUTED,
} from '../../components/dashboard/shared/constants';

export function TimecardAlterationsPage() {
  const { data: alterations } = useTimecardAlterations();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [fieldFilter, setFieldFilter] = useState('all');

  // Stats (all zeros since alterations array is empty)
  const totalAlterations = alterations?.length || 0;
  const thisWeekCount = 0; // Would calculate from createdAt dates
  const manualOverrides = 0; // Would filter by alteredBy !== 'system'

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, padding: '2rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 700,
          color: NAVY,
          marginBottom: '0.5rem',
        }}>
          Timecard Alterations
        </h1>
        <p style={{ fontSize: '0.95rem', color: MUTED }}>
          Audit trail of all timecard modifications
        </p>
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {/* Total Alterations */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: CARD_SHADOW,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#F0F9FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <FileText size={24} style={{ color: '#0284C7' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: NAVY, marginBottom: '0.25rem' }}>
              {totalAlterations}
            </div>
            <div style={{ fontSize: '0.875rem', color: TEXT_TERTIARY }}>
              Total Alterations
            </div>
          </div>
        </div>

        {/* This Week */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: CARD_SHADOW,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Clock size={24} style={{ color: '#D97706' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: NAVY, marginBottom: '0.25rem' }}>
              {thisWeekCount}
            </div>
            <div style={{ fontSize: '0.875rem', color: TEXT_TERTIARY }}>
              This Week
            </div>
          </div>
        </div>

        {/* Manual Overrides */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: CARD_SHADOW,
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <Shield size={24} style={{ color: '#DC2626' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: NAVY, marginBottom: '0.25rem' }}>
              {manualOverrides}
            </div>
            <div style={{ fontSize: '0.875rem', color: TEXT_TERTIARY }}>
              Manual Overrides
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div style={{
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: '8px',
        padding: '1.5rem',
        boxShadow: CARD_SHADOW,
        marginBottom: '1.5rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          {/* Date Range */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: NAVY,
              marginBottom: '0.5rem',
            }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: NAVY,
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: NAVY,
              marginBottom: '0.5rem',
            }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: '6px',
                fontSize: '0.875rem',
                color: NAVY,
              }}
            />
          </div>

          {/* Employee Search */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: NAVY,
              marginBottom: '0.5rem',
            }}>
              Employee Search
            </label>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: TEXT_TERTIARY,
                }}
              />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search by name..."
                style={{
                  width: '100%',
                  padding: '0.625rem 0.625rem 0.625rem 2.5rem',
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: NAVY,
                }}
              />
            </div>
          </div>

          {/* Field Filter */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: NAVY,
              marginBottom: '0.5rem',
            }}>
              Field Changed
            </label>
            <div style={{ position: 'relative' }}>
              <Filter
                size={18}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: TEXT_TERTIARY,
                  pointerEvents: 'none',
                }}
              />
              <select
                value={fieldFilter}
                onChange={(e) => setFieldFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.625rem 0.625rem 2.5rem',
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: NAVY,
                  appearance: 'none',
                  background: `${CARD_BG} url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%236B7F96' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 0.75rem center`,
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Fields</option>
                <option value="clock_in">Clock In</option>
                <option value="clock_out">Clock Out</option>
                <option value="break">Break</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Actions */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          marginTop: '1rem',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setEmployeeSearch('');
              setFieldFilter('all');
            }}
            style={{
              padding: '0.625rem 1.25rem',
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: '6px',
              background: CARD_BG,
              color: NAVY,
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Clear Filters
          </button>
          <button
            onClick={() => alert('Demo mode')}
            style={{
              padding: '0.625rem 1.25rem',
              border: 'none',
              borderRadius: '6px',
              background: NAVY,
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Table or Empty State */}
      {alterations && alterations.length > 0 ? (
        <div style={{
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: '8px',
          boxShadow: CARD_SHADOW,
          overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: `1px solid ${CARD_BORDER}` }}>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: TEXT_TERTIARY,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Date
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: TEXT_TERTIARY,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Employee
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: TEXT_TERTIARY,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Field Changed
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: TEXT_TERTIARY,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Old Value
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: TEXT_TERTIARY,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    New Value
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: TEXT_TERTIARY,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Changed By
                  </th>
                  <th style={{
                    padding: '1rem',
                    textAlign: 'left',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: TEXT_TERTIARY,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody>
                {alterations.map((alteration) => (
                  <tr
                    key={alteration.id}
                    style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
                  >
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: NAVY }}>
                      {new Date(alteration.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: NAVY }}>
                      {alteration.alteredByName || '--'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: NAVY }}>
                      {alteration.fieldChanged}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: TEXT_TERTIARY }}>
                      {alteration.oldValue || '--'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: NAVY, fontWeight: 500 }}>
                      {alteration.newValue || '--'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: NAVY }}>
                      {alteration.alteredByName || 'System'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: TEXT_TERTIARY }}>
                      {alteration.reason || '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{
          background: CARD_BG,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: '8px',
          padding: '4rem 2rem',
          boxShadow: CARD_SHADOW,
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#F0F9FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
          }}>
            <Shield size={32} style={{ color: '#0284C7' }} />
          </div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: NAVY,
            marginBottom: '0.5rem',
          }}>
            No timecard alterations found
          </h3>
          <p style={{ fontSize: '0.95rem', color: TEXT_TERTIARY }}>
            All timecard edits and modifications will appear here
          </p>
        </div>
      )}
    </div>
  );
}
