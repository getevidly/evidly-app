import { useState } from 'react';
import { X, Mail, FileText, CheckCircle } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedDocuments?: string[];
  documentType?: 'document' | 'report' | 'compliance';
}

export function ShareModal({ isOpen, onClose, preselectedDocuments = [], documentType = 'document' }: ShareModalProps) {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientType, setRecipientType] = useState('health-inspector');
  const [includeCompliance, setIncludeCompliance] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const availableDocuments = [
    'Business License - Downtown',
    'Food Handler Certificate - John Smith',
    'Fire Suppression Certificate',
    'Health Permit - Downtown',
    'COI - A1 Fire Protection',
  ];

  const [selectedDocs, setSelectedDocs] = useState<string[]>(preselectedDocuments);

  const handleToggleDocument = (doc: string) => {
    if (selectedDocs.includes(doc)) {
      setSelectedDocs(selectedDocs.filter(d => d !== doc));
    } else {
      setSelectedDocs([...selectedDocs, doc]);
    }
  };

  const handleSend = async () => {
    if (!recipientEmail) {
      alert('Please enter recipient email');
      return;
    }

    setSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    setSent(true);

    setTimeout(() => {
      onClose();
      setSent(false);
      setRecipientName('');
      setRecipientEmail('');
      setMessage('');
      setSelectedDocs([]);
      setIncludeCompliance(false);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {sent ? (
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                {documentType === 'document' ? 'Documents Shared!' : documentType === 'report' ? 'Report Shared!' : 'Compliance Report Shared!'}
              </h3>
              <p className="text-gray-600">
                Successfully shared with {recipientEmail}
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#1e4d6b] bg-opacity-10">
                      <Mail className="h-5 w-5 text-[#1e4d6b]" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Share {documentType === 'document' ? 'Documents' : documentType === 'report' ? 'Report' : 'Compliance Report'}
                    </h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <p className="text-sm text-gray-600">
                  Send {documentType === 'document' ? 'documents' : 'reports'} securely to third parties. Links expire in 7 days.
                </p>
              </div>

              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                    placeholder="Enter recipient name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                    placeholder="recipient@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recipient Type
                  </label>
                  <select
                    value={recipientType}
                    onChange={(e) => setRecipientType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                  >
                    <option value="health-inspector">Health Inspector</option>
                    <option value="insurance">Insurance Company</option>
                    <option value="fire-marshal">Fire Marshal</option>
                    <option value="corporate">Corporate Office</option>
                    <option value="landlord">Landlord</option>
                    <option value="franchise">Franchise</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {documentType === 'document' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Documents to Share
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                      {availableDocuments.map((doc) => (
                        <label key={doc} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedDocs.includes(doc)}
                            onChange={() => handleToggleDocument(doc)}
                            className="h-4 w-4 text-[#1e4d6b] focus:ring-[#1e4d6b] border-gray-300 rounded"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{doc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedDocs.length} document{selectedDocs.length !== 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-700">Include Compliance Score?</div>
                    <div className="text-xs text-gray-500">Attaches a compliance summary PDF</div>
                  </div>
                  <button
                    onClick={() => setIncludeCompliance(!includeCompliance)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:ring-offset-2 ${
                      includeCompliance ? 'bg-[#1e4d6b]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        includeCompliance ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Message (Optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none"
                    placeholder="Add a personal message..."
                  />
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={sending}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending || !recipientEmail}
                  className="px-6 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
