/* Types for PortalRecordView.jsx so PortalPage.tsx imports it without an
 * implicit-any module (TS7016). Keep in step with the component's props. */
import type { FormEvent, ReactElement } from 'react';

export interface PortalRecordViewRecord {
  recipient_name: string;
  cover_message: string | null;
  sent_at: string;
  expires_at: string;
  org_name: string;
}

export interface PortalRecordViewSeal {
  hash: string;
  sealed_at: string;
  cert_number: string | null;
  service_date: string | null;
  next_due_date: string | null;
}

export interface PortalRecordViewDocument {
  id: string;
  name: string;
  type: string | null;
  expiration_date: string | null;
  has_file: boolean;
  seal?: PortalRecordViewSeal | null;
  display_name?: string;
  ref_line?: string;
  is_sealed?: boolean;
}

export interface PortalRecordViewProps {
  record: PortalRecordViewRecord;
  documents: PortalRecordViewDocument[];
  view: 'shared' | 'client';
  /** /portal/sample only: shows the label and turns the action buttons into notes. */
  sample?: boolean;
  downloading?: string | null;
  onDownload?: (docId: string) => void;
  shareOpen?: boolean;
  shareEmail?: string;
  shareState?: 'idle' | 'sending' | 'sent' | 'error';
  shareError?: string | null;
  sharedTo?: string | null;
  onShareOpen?: () => void;
  onShareEmailChange?: (value: string) => void;
  onShareSubmit?: (e: FormEvent) => void;
  onShareAgain?: () => void;
}

export declare function PortalRecordView(props: PortalRecordViewProps): ReactElement;
export default PortalRecordView;
