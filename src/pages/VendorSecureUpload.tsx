import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Upload, CheckCircle, AlertCircle, Loader, FileText, X } from 'lucide-react';
import { validateSecureToken, uploadViaSecureToken } from '../lib/api';

export function VendorSecureUpload() {
  const { token } = useParams<{ token: string }>();
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (token) {
      validateSecureToken(token)
        .then((data) => {
          if (data.valid) {
            setTokenData(data);
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
    } catch (err) {
      setError('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 text-[#1e4d6b] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link Not Valid</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Upload Successful!</h1>
          <p className="text-gray-600 mb-2">
            Your document has been securely delivered to <strong>{tokenData?.organization_name}</strong>.
          </p>
          <p className="text-sm text-gray-400">You can close this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="h-8 w-8 text-[#d4af37]" />
            <span className="text-2xl font-bold">
              <span className="text-[#1e4d6b]">Evid</span>
              <span className="text-[#d4af37]">LY</span>
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Secure Document Upload</h1>
          <p className="text-gray-500 mt-1">
            Requested by <strong>{tokenData?.organization_name}</strong>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5">
          {/* What's needed */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-1">Document Requested</p>
            <p className="text-blue-800 font-bold text-lg">{tokenData?.document_type}</p>
            <p className="text-xs text-blue-600 mt-2">
              Upload link expires: {new Date(tokenData?.expires_at).toLocaleDateString()}
            </p>
          </div>

          {/* File drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
              file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-[#1e4d6b] hover:bg-blue-50/30'
            }`}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div>
                <FileText className="w-10 h-10 text-green-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-2 text-xs text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700">
                  Drop your file here or <span className="text-[#1e4d6b] font-semibold">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">PDF, JPG, PNG, or Word — Max 25MB</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details about this document..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] resize-none"
              rows={3}
            />
          </div>

          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-[#1e4d6b] text-white rounded-lg font-semibold hover:bg-[#163a52] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

          <p className="text-xs text-gray-400 text-center mt-4">
            🔒 Your upload is encrypted and secure. Only {tokenData?.organization_name} can access it.
          </p>
        </div>
      </div>
    </div>
  );
}
