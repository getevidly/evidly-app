import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Wrench, TrendingUp, Send, FileCheck } from 'lucide-react';

const TABS = [
  { id: 'vendors',    label: 'Vendors',         icon: Building2 },
  { id: 'services',   label: 'Services',        icon: Wrench },
  { id: 'performance',label: 'Performance',      icon: TrendingUp },
  { id: 'requests',   label: 'Requests',         icon: Send },
  { id: 'documents',  label: 'Document review',  icon: FileCheck },
];

/* Lazy tab imports — filled in Commits 2-3 */
import { VendorListTab }     from './tabs/VendorListTab';
import { ServicesTab }       from './tabs/ServicesTab';
import { PerformanceTab }    from './tabs/PerformanceTab';
import { RequestsTab }       from './tabs/RequestsTab';
import { DocumentReviewTab } from './tabs/DocumentReviewTab';

const TAB_COMPONENTS = {
  vendors:     VendorListTab,
  services:    ServicesTab,
  performance: PerformanceTab,
  requests:    RequestsTab,
  documents:   DocumentReviewTab,
};

export default function VendorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.find(t => t.id === searchParams.get('tab'))?.id || 'vendors';
  const [activeTab, setActiveTab] = useState(initialTab);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const ActiveComponent = TAB_COMPONENTS[activeTab] || VendorListTab;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F1EA' }}>
      {/* Page header */}
      <div className="px-4 pt-5 pb-3">
        <p
          className="uppercase tracking-wider mb-1"
          style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', color: '#A08C5A' }}
        >
          Vendor services
        </p>
        <h1
          className="leading-tight"
          style={{ fontSize: '22px', fontWeight: 500, color: '#1E2D4D' }}
        >
          Vendor Services
        </h1>
      </div>

      {/* Sub-tab strip */}
      <div
        className="flex gap-0 px-4 overflow-x-auto"
        style={{ borderBottom: '1px solid #E2DDD4' }}
      >
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className="flex items-center gap-1.5 px-3 py-2.5 whitespace-nowrap transition-colors"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: isActive ? '#1E2D4D' : '#5A6478',
                borderBottom: isActive ? '2px solid #1E2D4D' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4 pb-24">
        <ActiveComponent />
      </div>
    </div>
  );
}
