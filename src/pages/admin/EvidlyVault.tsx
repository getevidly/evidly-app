/**
 * EvidlyVault — Internal document vault for EvidLY business records.
 *
 * Stores: legal, contracts, IP filings, insurance, certifications,
 *         HR, financial, internal SOPs.
 *
 * Status: Placeholder. Backing table `evidly_vault_documents` not yet created.
 *         Page is hidden from AdminShell nav until table is built (hidden: true).
 *         Direct URL access shows placeholder UI; does not query missing table.
 */
import AdminBreadcrumb from '../../components/admin/AdminBreadcrumb';

export default function EvidlyVault() {
  return (
    <div className="space-y-6">
      <AdminBreadcrumb crumbs={[{ label: 'EvidLY Vault' }]} />

      <div className="bg-white rounded-xl border border-navy/10 p-12 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-navy mb-2">EvidLY Vault</h1>
        <p className="text-sm text-navy/60 max-w-md mx-auto">
          Internal vault for EvidLY business records — legal, contracts, IP filings,
          insurance, certifications, HR, financial, and internal SOPs.
        </p>
        <p className="text-xs text-navy/40 mt-6">
          Backing storage not yet provisioned. Page reserved.
        </p>
      </div>
    </div>
  );
}
