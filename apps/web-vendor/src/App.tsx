import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Dashboard
const VendorDashboard = lazy(() => import('./pages/VendorDashboard').then(m => ({ default: m.VendorDashboard || m.default })));

// Sales
const SalesDashboardPage = lazy(() => import('./pages/sales/SalesDashboardPage'));
const SalesPipelinePage = lazy(() => import('./pages/sales/SalesPipelinePage'));
const LeadDetailPage = lazy(() => import('./pages/sales/LeadDetailPage'));
const QuoteGeneratorPage = lazy(() => import('./pages/sales/QuoteGeneratorPage'));
const DoorKnockPage = lazy(() => import('./pages/sales/DoorKnockPage'));
const CallListPage = lazy(() => import('./pages/sales/CallListPage'));
const CompetitorIntelPage = lazy(() => import('./pages/sales/CompetitorIntelPage'));
const SalesAnalyticsPage = lazy(() => import('./pages/sales/SalesAnalyticsPage'));
const TerritoryMapPage = lazy(() => import('./pages/sales/TerritoryMapPage'));

// Marketing
const CampaignsPage = lazy(() => import('./pages/marketing/CampaignsPage'));
const CampaignBuilderPage = lazy(() => import('./pages/marketing/CampaignBuilderPage'));
const ViolationOutreachPage = lazy(() => import('./pages/marketing/ViolationOutreachPage'));
const EmailTemplatesPage = lazy(() => import('./pages/marketing/EmailTemplatesPage'));
const SequencesPage = lazy(() => import('./pages/marketing/SequencesPage'));
const SequenceBuilderPage = lazy(() => import('./pages/marketing/SequenceBuilderPage'));
const MarketingAnalyticsPage = lazy(() => import('./pages/marketing/MarketingAnalyticsPage'));

// Agreements
const AgreementsPage = lazy(() => import('./pages/agreements/AgreementsPage'));
const CreateAgreementPage = lazy(() => import('./pages/agreements/CreateAgreementPage'));
const AgreementDetailPage = lazy(() => import('./pages/agreements/AgreementDetailPage'));
const AgreementTemplatesPage = lazy(() => import('./pages/agreements/AgreementTemplatesPage'));
const TemplateEditorPage = lazy(() => import('./pages/agreements/TemplateEditorPage'));
const AgreementRenewalsPage = lazy(() => import('./pages/agreements/AgreementRenewalsPage'));

// Public
const SignAgreementPage = lazy(() => import('./pages/public/SignAgreementPage'));

function PageSkeleton() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#F4F6FA]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e4d6b]" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* Public routes (no auth) */}
          <Route path="/sign/:token" element={<SignAgreementPage />} />

          {/* Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<VendorDashboard />} />

          {/* Sales */}
          <Route path="/sales" element={<SalesDashboardPage />} />
          <Route path="/sales/pipeline" element={<SalesPipelinePage />} />
          <Route path="/sales/leads/:id" element={<LeadDetailPage />} />
          <Route path="/sales/quote" element={<QuoteGeneratorPage />} />
          <Route path="/sales/door-knock" element={<DoorKnockPage />} />
          <Route path="/sales/calls" element={<CallListPage />} />
          <Route path="/sales/competitors" element={<CompetitorIntelPage />} />
          <Route path="/sales/analytics" element={<SalesAnalyticsPage />} />
          <Route path="/sales/map" element={<TerritoryMapPage />} />

          {/* Marketing */}
          <Route path="/marketing/campaigns" element={<CampaignsPage />} />
          <Route path="/marketing/campaigns/new" element={<CampaignBuilderPage />} />
          <Route path="/marketing/violations" element={<ViolationOutreachPage />} />
          <Route path="/marketing/templates" element={<EmailTemplatesPage />} />
          <Route path="/marketing/sequences" element={<SequencesPage />} />
          <Route path="/marketing/sequences/:id" element={<SequenceBuilderPage />} />
          <Route path="/marketing/analytics" element={<MarketingAnalyticsPage />} />

          {/* Agreements */}
          <Route path="/agreements" element={<AgreementsPage />} />
          <Route path="/agreements/new" element={<CreateAgreementPage />} />
          <Route path="/agreements/templates" element={<AgreementTemplatesPage />} />
          <Route path="/agreements/templates/:id" element={<TemplateEditorPage />} />
          <Route path="/agreements/renewals" element={<AgreementRenewalsPage />} />
          <Route path="/agreements/:id" element={<AgreementDetailPage />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
