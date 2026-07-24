/**
 * MarketingMethods — redirect stub.
 *
 * Methods was folded into Channels (same concept).
 * This redirect keeps any bookmarks working.
 */
import { Navigate } from 'react-router-dom';

export default function MarketingMethods() {
  return <Navigate to="/admin/marketing/channels" replace />;
}
