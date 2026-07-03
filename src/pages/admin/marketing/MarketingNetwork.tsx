/**
 * MarketingNetwork — deep-link wrapper for Network tab
 *
 * Route: /admin/marketing/network
 * Access: salesOnly (SalesGuard)
 */
import MarketingConsole from './MarketingConsole';

export default function MarketingNetwork() {
  return <MarketingConsole defaultTab="network" />;
}
