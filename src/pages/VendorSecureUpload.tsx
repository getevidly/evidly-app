import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Upload, CheckCircle, AlertCircle, Loader, FileText, FileSearch, Send } from 'lucide-react';
import { EvidlyIcon } from '../components/ui/EvidlyIcon';
import {
  validateSecureToken,
  uploadViaSecureToken,
  checkViaSecureToken,
  sendViaSecureToken,
} from '../lib/api';
import { AIAssistButton, AIGeneratedIndicator } from '../components/ui/AIAssistButton';

/* One row of the sender-side check, as vendor-secure-upload returns it. */
interface CheckRow {
  key: 'expiration' | 'number' | 'insured_name';
  detail: string;
  you_typed: string | null;
  on_document: string | null;
  result: 'match' | 'mismatch' | 'not_found';
  fix: string | null;
}

interface CheckState {
  status: 'draft' | 'needs_fix' | 'sent';
  has_file: boolean;
  file_name: string | null;
  typed_expiration_date: string | null;
  typed_doc_number: string | null;
  rows: CheckRow[];
  passed: boolean;
  checked_at: string | null;
  read_error: string | null;
}

const RESULT_TEXT: Record<CheckRow['result'], string> = {
  match: 'Matches',
  mismatch: 'Does Not Match',
  not_found: 'Not Found on the Document',
};

export function VendorSecureUpload() {
  const { token } = useParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [aiFields, setAiFields] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sender-side check (business documents)
  const [check, setCheck] = useState<CheckState | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [openedForFix, setOpenedForFix] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const dateInput = useRef<HTMLInputElement | null>(null);
  const numberInput = useRef<HTMLInputElement | null>(null);

  const checked = Boolean(tokenData?.checked);

  useEffect(() => {
    if (token) {
      validateSecureToken(token)
        .then((data) => {
          if (data.valid) {
            setTokenData(data);
            const c: CheckState | null = data.check || null;
            if (c) {
              setCheck(c);
              setExpirationDate(c.typed_expiration_date || '');
              setDocNumber(c.typed_doc_number || '');
              setOpenedForFix(c.status === 'needs_fix');
            }
          } else {
            setError(data.error || 'Invalid or expired link');
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Unable to validate link. Please contact your client.');
          setLoading(false);
        });
    }
  }, [token]);

  const fieldsReady =
    (!tokenData?.needs_expiry || Boolean(expirationDate)) &&
    (!tokenData?.needs_number || Boolean(docNumber.trim()));
  const hasFile = Boolean(file) || Boolean(check?.has_file);

  const runCheck = useCallback(async () => {
    if (!token || !fieldsReady || !hasFile) return;
    setChecking(true);
    setCheckError(null);
    try {
      const result = await checkViaSecureToken(token, {
        file,
        expirationDate,
        docNumber,
      });
      if (result?.check) {
        setCheck(result.check);
        setFile(null); // stored as the draft now
        if (fileInput.current) fileInput.current.value = '';
        setDirty(false);
      } else {
        setCheckError(result?.error || 'The check did not run. Try again.');
      }
    } catch {
      setCheckError('The check did not run. Try again.');
    }
    setChecking(false);
  }, [token, fieldsReady, hasFile, file, expirationDate, docNumber]);

  // Changing a field or the file re-runs the check once the sender pauses.
  useEffect(() => {
    if (!checked || !dirty || !check || checking) return;
    if (!fieldsReady || !hasFile) return;
    const t = setTimeout(() => { runCheck(); }, 900);
    return () => clearTimeout(t);
  }, [checked, dirty, check, checking, fieldsReady, hasFile, runCheck]);

  const markChanged = () => { setDirty(true); setOpenedForFix(false); };

  const handleSend = async () => {
    if (!token) return;
    setUploading(true);
    setCheckError(null);
    try {
      const result = await sendViaSecureToken(token, notes);
      if (result.success) {
        setSuccess(true);
      } else {
        setCheckError(result.error || 'Send did not go through. Try again.');
      }
    } catch {
      setCheckError('Send did not go through. Try again.');
    }
    setUploading(false);
  };

  // Service reports keep the original one-step upload.
  const handleUpload = async () => {
    if (!file || !token) return;
    setUploading(true);
    try {
      const result = await uploadViaSecureToken(token, file, notes);
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Upload failed');
      }
    } catch {
      setError('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const pickFile = (f: File | null) => {
    setFile(f);
    if (checked && f) markChanged();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) pickFile(droppedFile);
  };

  const onFix = (row: CheckRow) => {
    if (row.fix === 'Fix Expiration Date') dateInput.current?.focus();
    else if (row.fix === 'Fix Number') numberInput.current?.focus();
    else fileInput.current?.click();
  };

  const recipient = tokenData?.organization_name || 'your client';
  const sendReady = checked && Boolean(check?.passed) && !dirty && !checking && !file;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center">
        <Loader className="w-8 h-8 text-[#1E2D4D] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#1E2D4D] mb-2">Link Not Valid</h1>
          <p className="text-[#1E2D4D]/70">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-[#1E2D4D] mb-2">
            {checked ? `Sent to ${recipient}` : 'Upload Successful!'}
          </h1>
          <p className="text-[#1E2D4D]/70 mb-2">
            {checked
              ? <>Every detail matched. <strong>{recipient}</strong> can now preview and accept it.</>
              : <>Your document has been securely delivered to <strong>{tokenData?.organization_name}</strong>.</>}
          </p>
          <p className="text-sm text-[#1E2D4D]/30">You can close this page.</p>
        </div>
      </div>
    );
  }

  const dropZone = (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
        file || check?.has_file ? 'border-green-300 bg-green-50' : 'border-[#1E2D4D]/15 hover:border-[#1E2D4D] hover:bg-blue-50/30'
      }`}
      onClick={() => fileInput.current?.click()}
    >
      <input
        ref={fileInput}
        id="file-input"
        type="file"
        accept={checked ? '.pdf,.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png,.heic,.doc,.docx'}
        className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] || null)}
      />
      {file || check?.has_file ? (
        <div>
          <FileText className="w-10 h-10 text-green-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#1E2D4D]">{file ? file.name : check?.file_name}</p>
          {file && (
            <p className="text-xs text-[#1E2D4D]/50 mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          )}
          <p className="mt-2 text-xs text-[#1E2D4D]/60">Choose a Different File</p>
        </div>
      ) : (
        <div>
          <Upload className="w-10 h-10 text-[#1E2D4D]/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-[#1E2D4D]/80">
            Drop your file here or <span className="text-[#1E2D4D] font-semibold">browse</span>
          </p>
          <p className="text-xs text-[#1E2D4D]/30 mt-2">
            {checked ? 'PDF, JPG or PNG — Max 25MB' : 'PDF, JPG, PNG, or Word — Max 25MB'}
          </p>
        </div>
      )}
    </div>
  );

  const notesField = (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-[#1E2D4D]/80">Notes (optional)</label>
        <AIAssistButton
          fieldLabel="Notes"
          context={{ documentType: tokenData?.document_type }}
          currentValue={notes}
          onGenerated={(text) => { setNotes(text); setAiFields(prev => new Set(prev).add('notes')); }}
        />
      </div>
      <textarea
        value={notes}
        onChange={(e) => { setNotes(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('notes'); return n; }); }}
        placeholder="Any additional details about this document..."
        className="w-full p-3 border border-[#1E2D4D]/15 rounded-xl text-sm focus:ring-2 focus-visible:ring-[#B24A2E]/50 focus-visible:ring-offset-2 resize-none"
        rows={3}
      />
      {aiFields.has('notes') && <AIGeneratedIndicator />}
    </div>
  );

  const mismatchKeys = new Set((check?.rows || []).filter((r) => r.result !== 'match').map((r) => r.key));
  const fieldClass = (key: CheckRow['key']) =>
    `mt-1 w-full p-3 border rounded-xl text-sm ${
      !dirty && mismatchKeys.has(key) ? 'border-red-400 bg-red-50' : 'border-[#1E2D4D]/15'
    }`;

  return (
    <div className="min-h-screen bg-[#FAF7F0] py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <EvidlyIcon size={32} />
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-[#1E2D4D]">Evid</span>
              <span className="text-[#B24A2E]">LY</span>
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#1E2D4D]">Secure Document Upload</h1>
          <p className="text-[#1E2D4D]/50 mt-1">
            Requested by <strong>{tokenData?.organization_name}</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-[#1E2D4D]/10 p-4 sm:p-5">
          {/* What's needed */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-1">Document Requested</p>
            <p className="text-blue-800 font-bold text-lg">{tokenData?.document_type}</p>
            <p className="text-xs text-blue-600 mt-2">
              Upload link expires: {new Date(tokenData?.expires_at).toLocaleDateString()}
            </p>
          </div>

          {openedForFix && check?.status === 'needs_fix' && (
            <div data-testid="needs-fix-banner" className="mb-4 p-3 rounded-xl border border-red-300 bg-red-50 text-sm text-red-800">
              One detail on your {tokenData?.document_type} does not match. Fix it below, then send it.
            </div>
          )}

          {dropZone}

          {checked && (tokenData?.needs_expiry || tokenData?.needs_number) && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {tokenData?.needs_expiry && (
                <label className="block">
                  <span className="text-sm font-medium text-[#1E2D4D]/80">Expiration Date</span>
                  <input
                    ref={dateInput}
                    type="date"
                    required
                    value={expirationDate}
                    onChange={(e) => { setExpirationDate(e.target.value); markChanged(); }}
                    className={fieldClass('expiration')}
                  />
                </label>
              )}
              {tokenData?.needs_number && (
                <label className="block">
                  <span className="text-sm font-medium text-[#1E2D4D]/80">{tokenData?.number_label || 'Policy or License Number'}</span>
                  <input
                    ref={numberInput}
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => { setDocNumber(e.target.value); markChanged(); }}
                    className={fieldClass('number')}
                  />
                </label>
              )}
            </div>
          )}

          {checked && (
            <>
              <button
                type="button"
                onClick={runCheck}
                disabled={!hasFile || !fieldsReady || checking}
                className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 border border-[#1E2D4D] text-[#1E2D4D] rounded-lg font-semibold hover:bg-[#1E2D4D]/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checking ? <Loader className="w-5 h-5 animate-spin" /> : <FileSearch className="w-5 h-5" />}
                {checking ? 'Checking Your Document…' : 'Check My Document'}
              </button>

              {check?.read_error && !dirty && (
                <p className="mt-3 text-sm text-red-700">{check.read_error}</p>
              )}

              {check && check.rows.length > 0 && (
                <div className={`mt-4 overflow-x-auto ${dirty || checking ? 'opacity-50' : ''}`}>
                  <table className="w-full text-sm" data-testid="check-table">
                    <thead>
                      <tr className="text-left text-[#1E2D4D]/60">
                        <th className="py-2 pr-2 font-medium">Detail</th>
                        <th className="py-2 pr-2 font-medium">You Typed</th>
                        <th className="py-2 pr-2 font-medium">On the Document</th>
                        <th className="py-2 font-medium">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {check.rows.map((row) => {
                        const ok = row.result === 'match';
                        return (
                          <tr key={row.key} data-result={row.result} className={`border-t border-[#1E2D4D]/10 ${ok ? '' : 'bg-red-50'}`}>
                            <td className="py-2 pr-2 font-medium text-[#1E2D4D]">{row.detail}</td>
                            <td className="py-2 pr-2 text-[#1E2D4D]/80">{row.you_typed || '—'}</td>
                            <td className="py-2 pr-2 text-[#1E2D4D]/80">{row.on_document || '—'}</td>
                            <td className="py-2">
                              <span className={ok ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                                {RESULT_TEXT[row.result]}
                              </span>
                              {!ok && row.fix && (
                                <button
                                  type="button"
                                  onClick={() => onFix(row)}
                                  className="block mt-1 text-xs font-semibold text-[#B24A2E] underline"
                                >
                                  {row.fix}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {dirty && <p className="mt-2 text-xs text-[#1E2D4D]/60">You changed something. Checking again…</p>}
                </div>
              )}

              {checkError && <p className="mt-3 text-sm text-red-700">{checkError}</p>}

              {notesField}

              <button
                type="button"
                onClick={handleSend}
                disabled={!sendReady || uploading}
                data-testid="send-button"
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-[#1E2D4D] text-white rounded-lg font-semibold hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? <Loader className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {uploading ? 'Sending…' : `Send to ${recipient}`}
              </button>
              {!sendReady && (
                <p className="text-xs text-[#1E2D4D]/50 text-center mt-2">
                  Send turns on when every detail on your document matches what you typed.
                </p>
              )}
            </>
          )}

          {!checked && (
            <>
              {notesField}
              <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-[#1E2D4D] text-white rounded-lg font-semibold hover:bg-[#162340] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload Document
                  </>
                )}
              </button>
            </>
          )}

          <p className="text-xs text-[#1E2D4D]/30 text-center mt-4">
            🔒 Your upload is encrypted and secure. Only {tokenData?.organization_name} can access it, and only after you send it.
          </p>
        </div>
      </div>
    </div>
  );
}
