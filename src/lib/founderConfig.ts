// Founder contact info — configurable via env vars or update here
export const FOUNDER = {
  name: import.meta.env.VITE_FOUNDER_NAME || 'Arthur Haggerty',
  title: import.meta.env.VITE_FOUNDER_TITLE || 'Founder & CEO, EvidLY',
  email: import.meta.env.VITE_FOUNDER_EMAIL || 'arthur@getevidly.com',
  phone: import.meta.env.VITE_FOUNDER_PHONE || '(559) 555-0100',
  firstName: (import.meta.env.VITE_FOUNDER_NAME || 'Arthur Haggerty').split(' ')[0],
};
