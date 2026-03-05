// ---------------------------------------------------------------------------
// EmulationContext — User Emulation for Super Admins (platform_admin)
// ---------------------------------------------------------------------------
// Stores the original admin session in application state (never modifies JWTs).
// Injects the target user's role and location scope into the active session.
// Renders a persistent high-contrast banner when emulation is active.
// Blocks restricted operations: password reset, billing, account deletion, role changes.
// ---------------------------------------------------------------------------

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRole } from './RoleContext';
import type { UserRole } from './RoleContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmulatedUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  location?: string;
}

interface OriginalAdminSession {
  adminRole: UserRole;
  adminName: string;
  adminId: string;
}

interface EmulationContextType {
  /** Whether emulation is currently active */
  isEmulating: boolean;
  /** The user being emulated */
  emulatedUser: EmulatedUser | null;
  /** The original admin session data */
  originalAdmin: OriginalAdminSession | null;
  /** The audit log ID for the current emulation session */
  auditLogId: string | null;
  /** Start emulating a user */
  startEmulation: (user: EmulatedUser, admin: OriginalAdminSession) => Promise<void>;
  /** Stop emulation and restore admin session */
  stopEmulation: () => Promise<void>;
  /** Check if an operation is blocked during emulation */
  isOperationBlocked: (operation: BlockedOperation) => boolean;
  /** Show the blocked operation modal */
  showBlockedModal: (operation: BlockedOperation) => void;
  /** State for the blocked modal */
  blockedModalState: { show: boolean; operation: BlockedOperation | null };
  /** Close the blocked modal */
  closeBlockedModal: () => void;
}

export type BlockedOperation =
  | 'password_reset'
  | 'billing_changes'
  | 'account_deletion'
  | 'role_changes';

const BLOCKED_OPERATION_LABELS: Record<BlockedOperation, { title: string; description: string }> = {
  password_reset: {
    title: 'Password Reset Blocked',
    description: 'Password resets cannot be performed during user emulation. Exit emulation to manage passwords.',
  },
  billing_changes: {
    title: 'Billing Changes Blocked',
    description: 'Billing modifications are not allowed during user emulation. Exit emulation to manage billing.',
  },
  account_deletion: {
    title: 'Account Deletion Blocked',
    description: 'Account deletion is not permitted during user emulation. Exit emulation to manage accounts.',
  },
  role_changes: {
    title: 'Role Changes Blocked',
    description: 'Role assignments cannot be changed during user emulation. Exit emulation to manage roles.',
  },
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const EmulationContext = createContext<EmulationContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function EmulationProvider({ children }: { children: ReactNode }) {
  const { userRole, setUserRole } = useRole();
  const [isEmulating, setIsEmulating] = useState(false);
  const [emulatedUser, setEmulatedUser] = useState<EmulatedUser | null>(null);
  const [originalAdmin, setOriginalAdmin] = useState<OriginalAdminSession | null>(null);
  const [auditLogId, setAuditLogId] = useState<string | null>(null);
  const [blockedModalState, setBlockedModalState] = useState<{
    show: boolean;
    operation: BlockedOperation | null;
  }>({ show: false, operation: null });
  const emulationStartTime = useRef<number>(0);

  const startEmulation = useCallback(async (user: EmulatedUser, admin: OriginalAdminSession) => {
    // Log emulation start to audit table
    try {
      const { data } = await supabase
        .from('emulation_audit_log')
        .insert({
          admin_id: admin.adminId,
          target_user_id: user.id,
          started_at: new Date().toISOString(),
          actions_summary: `Emulation started: ${admin.adminName} → ${user.full_name} (${user.role})`,
        })
        .select('id')
        .single();

      if (data?.id) setAuditLogId(data.id);
    } catch {
      // In demo mode this will fail silently — that's OK
    }

    emulationStartTime.current = Date.now();
    setEmulatedUser(user);
    setOriginalAdmin(admin);
    setIsEmulating(true);

    // Inject the target user's role into the active session
    setUserRole(user.role);
  }, [setUserRole]);

  const stopEmulation = useCallback(async () => {
    // Log emulation end
    if (auditLogId) {
      const duration = Math.round((Date.now() - emulationStartTime.current) / 1000);
      try {
        await supabase
          .from('emulation_audit_log')
          .update({
            ended_at: new Date().toISOString(),
            actions_summary: `Emulation ended: session lasted ${duration}s`,
          })
          .eq('id', auditLogId);
      } catch {
        // Silent fail for demo mode
      }
    }

    // Restore the admin's original role
    if (originalAdmin) {
      setUserRole(originalAdmin.adminRole);
    }

    setIsEmulating(false);
    setEmulatedUser(null);
    setOriginalAdmin(null);
    setAuditLogId(null);
  }, [auditLogId, originalAdmin, setUserRole]);

  const isOperationBlocked = useCallback(
    (operation: BlockedOperation): boolean => {
      return isEmulating;
    },
    [isEmulating],
  );

  const showBlockedModal = useCallback((operation: BlockedOperation) => {
    setBlockedModalState({ show: true, operation });
  }, []);

  const closeBlockedModal = useCallback(() => {
    setBlockedModalState({ show: false, operation: null });
  }, []);

  return (
    <EmulationContext.Provider
      value={{
        isEmulating,
        emulatedUser,
        originalAdmin,
        auditLogId,
        startEmulation,
        stopEmulation,
        isOperationBlocked,
        showBlockedModal,
        blockedModalState,
        closeBlockedModal,
      }}
    >
      {children}

      {/* ── Emulation Banner — high-contrast, unmistakable ── */}
      {isEmulating && emulatedUser && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: '#A08C5A',
            color: '#ffffff',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(160, 140, 90, 0.4)',
            minHeight: '44px',
          }}
        >
          <ShieldAlert size={18} style={{ flexShrink: 0 }} />
          <span>
            You are viewing as{' '}
            <span style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              {emulatedUser.full_name}
            </span>
            {' '}({emulatedUser.role.replace(/_/g, ' ')})
          </span>
          <span style={{ opacity: 0.6, margin: '0 4px' }}>|</span>
          <span style={{ opacity: 0.8, fontSize: '13px', fontWeight: 400 }}>
            RLS active — read-only operations only
          </span>
          <button
            onClick={stopEmulation}
            style={{
              marginLeft: '12px',
              padding: '6px 16px',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.6)',
              borderRadius: '8px',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
          >
            <X size={14} />
            Exit Emulation
          </button>
        </div>
      )}

      {/* ── Blocked Operation Modal ── */}
      {blockedModalState.show && blockedModalState.operation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              maxWidth: '420px',
              width: '100%',
              margin: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={22} style={{ color: '#dc2626' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                {BLOCKED_OPERATION_LABELS[blockedModalState.operation].title}
              </h3>
            </div>
            <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, marginBottom: '20px' }}>
              {BLOCKED_OPERATION_LABELS[blockedModalState.operation].description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={closeBlockedModal}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: '#f3f4f6',
                  border: 'none',
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                Understood
              </button>
              <button
                onClick={() => {
                  closeBlockedModal();
                  stopEmulation();
                }}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 700,
                  background: '#A08C5A',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Exit Emulation
              </button>
            </div>
          </div>
        </div>
      )}
    </EmulationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEmulation() {
  const context = useContext(EmulationContext);
  if (context === undefined) {
    throw new Error('useEmulation must be used within an EmulationProvider');
  }
  return context;
}
