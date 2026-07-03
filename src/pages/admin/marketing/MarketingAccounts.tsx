/**
 * MarketingAccounts — deep-link wrapper for Accounts tab
 *
 * Route: /admin/marketing/accounts
 * Access: salesOnly (SalesGuard)
 */
import MarketingConsole from './MarketingConsole';

export default function MarketingAccounts() {
  return <MarketingConsole defaultTab="accounts" />;
}
