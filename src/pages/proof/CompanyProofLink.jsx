/**
 * CompanyProofLink — /company-proof
 *
 * Email Me a Link: a HoodOps company enters the email on its EvidLY records and
 * gets a 7-day link to /company-proof/:token. The answer is the same whether or
 * not the address is on file.
 */
import { useState } from 'react';
import { Button, C, callProof, MessageCard } from './proofUi';

export default function CompanyProofLink() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    await callProof('proof-access', { action: 'company.email_link', email: email.trim() });
    setBusy(false);
    setSent(true);
  };

  if (sent) {
    return (
      <MessageCard
        title="Check Your Email"
        message="If that email is on file for a company in EvidLY, a link to its certifications and insurance is on its way. The link works for 7 days."
      />
    );
  }

  return (
    <MessageCard
      title="Your Certifications and Insurance"
      message="Enter the email on your company's EvidLY records and we'll send you a link. No password needed."
    >
      <form onSubmit={send} style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"
          aria-label="Email"
          style={{ border: '1px solid #C5D3DC', borderRadius: 8, padding: '10px 12px', fontSize: 14, color: C.ink }}
        />
        <Button kind="dark" type="submit" disabled={busy} style={{ justifyContent: 'center' }}>
          {busy ? 'Sending...' : 'Email Me a Link'}
        </Button>
      </form>
    </MessageCard>
  );
}
