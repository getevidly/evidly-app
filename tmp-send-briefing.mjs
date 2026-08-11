import { readFileSync } from 'fs';

const SRK = readFileSync('tmp-srk.txt', 'utf8').trim();
const SUPABASE_URL = 'https://irxgmhxhmxtzfwuieblc.supabase.co';
const FN_URL = SUPABASE_URL + '/functions/v1/county-briefing';

async function getJWT() {
  const linkRes = await fetch(SUPABASE_URL + '/auth/v1/admin/generate_link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SRK,
      'Authorization': 'Bearer ' + SRK
    },
    body: JSON.stringify({ type: 'magiclink', email: 'arthur@getevidly.com' })
  });
  const linkData = await linkRes.json();
  const hashedToken = linkData.hashed_token;
  if (!hashedToken) { console.error('No hashed_token'); process.exit(1); }

  const verifyRes = await fetch(SUPABASE_URL + '/auth/v1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': SRK },
    body: JSON.stringify({ type: 'magiclink', token_hash: hashedToken })
  });
  const session = await verifyRes.json();
  if (!session.access_token) { console.error('No session:', JSON.stringify(session).substring(0, 300)); process.exit(1); }
  console.log('Authenticated as:', session.user?.email);
  return session.access_token;
}

async function callFn(jwt, action, body) {
  const res = await fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SRK,
      'Authorization': 'Bearer ' + jwt
    },
    body: JSON.stringify({ action, ...body })
  });
  return res.json();
}

async function main() {
  const jwt = await getJWT();

  // 1. Approve Merced
  const approve = await callFn(jwt, 'approve', { county: 'Merced' });
  console.log('Approve:', JSON.stringify(approve));
  if (approve.error) { console.error('STOPPED at approve'); process.exit(1); }

  // 2. Add recipient
  const add = await callFn(jwt, 'add-recipients', {
    recipients: [{
      email: 'arthur@getevidly.com',
      first_name: 'Arthur',
      county: 'Merced',
      variant: 'cold'
    }]
  });
  console.log('Add:', JSON.stringify(add));
  if (add.error) { console.error('STOPPED at add'); process.exit(1); }

  // 3. Send
  const send = await callFn(jwt, 'send', { county: 'Merced' });
  console.log('Send:', JSON.stringify(send));
}

main().catch(e => { console.error(e); process.exit(1); });
