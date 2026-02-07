import { useState } from 'react';
import { Phone, Mail, MessageSquare, Send, X, CheckCircle } from 'lucide-react';

interface VendorContactActionsProps {
  vendorName: string;
  contactName: string;
  email: string;
  phone: string;
}

export function VendorContactActions({ vendorName, contactName, email, phone }: VendorContactActionsProps) {
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  const handleCall = () => {
    window.open(`tel:${phone.replace(/\D/g, '')}`, '_self');
  };

  const handleSms = () => {
    setSmsMessage(`Hi ${contactName}, this is regarding your services at our location. `);
    setShowSmsModal(true);
  };

  const handleEmail = () => {
    setEmailSubject(`Service Update — ${vendorName}`);
    setEmailBody(`Hi ${contactName},\n\nI'm reaching out regarding your services at our location.\n\n`);
    setShowEmailModal(true);
  };

  const sendSms = () => {
    // In production: calls Supabase Edge Function → Twilio
    setShowSmsModal(false);
    setSent('sms');
    setTimeout(() => setSent(null), 3000);
  };

  const sendEmail = () => {
    // In production: calls Supabase Edge Function → Resend
    setShowEmailModal(false);
    setSent('email');
    setTimeout(() => setSent(null), 3000);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={handleCall}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title={`Call ${phone}`}
        >
          <Phone className="w-4 h-4 text-green-600" />
          <span className="hidden sm:inline">Call</span>
        </button>
        <button
          onClick={handleSms}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title="Send SMS"
        >
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="hidden sm:inline">Text</span>
        </button>
        <button
          onClick={handleEmail}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          title={`Email ${email}`}
        >
          <Mail className="w-4 h-4 text-purple-600" />
          <span className="hidden sm:inline">Email</span>
        </button>
      </div>

      {/* Success toast */}
      {sent && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg shadow-lg animate-slide-up">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{sent === 'sms' ? 'SMS sent!' : 'Email sent!'}</span>
        </div>
      )}

      {/* SMS Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Send SMS to {contactName}</h3>
              <button onClick={() => setShowSmsModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">To: {phone}</p>
            <textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none"
              rows={4}
              maxLength={160}
            />
            <div className="flex items-center justify-between mt-2 mb-4">
              <span className="text-xs text-gray-400">{smsMessage.length}/160</span>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSmsModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">
                Cancel
              </button>
              <button onClick={sendSms} className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium">
                <Send className="w-4 h-4" />
                Send SMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Email {contactName}</h3>
              <button onClick={() => setShowEmailModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-3">To: {email}</p>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Subject"
              className="w-full p-3 border border-gray-300 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
            />
            <textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent resize-none"
              rows={6}
            />
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg text-sm">
                Cancel
              </button>
              <button onClick={sendEmail} className="flex items-center gap-2 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#163a52] text-sm font-medium">
                <Send className="w-4 h-4" />
                Send Email
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
