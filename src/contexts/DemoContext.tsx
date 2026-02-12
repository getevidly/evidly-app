import { createContext, useContext, useState, useMemo, ReactNode } from 'react';

export interface DemoLead {
  fullName: string;
  email: string;
  companyName: string;
  businessType: string;
}

interface DemoContextType {
  isDemoMode: boolean;
  enterDemo: (lead?: DemoLead) => void;
  exitDemo: () => void;
  demoLead: DemoLead | null;
  setDemoLead: (lead: DemoLead) => void;
  tourActive: boolean;
  tourStep: number;
  setTourStep: (step: number) => void;
  startTour: () => void;
  completeTour: () => void;
  companyName: string;
  userName: string;
  firstName: string;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const DEMO_KEY = 'evidly_demo_mode';
const LEAD_KEY = 'evidly_demo_lead';

function loadLead(): DemoLead | null {
  try {
    const raw = sessionStorage.getItem(LEAD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    try {
      return sessionStorage.getItem(DEMO_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [demoLead, setDemoLeadState] = useState<DemoLead | null>(loadLead);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const setDemoLead = (lead: DemoLead) => {
    setDemoLeadState(lead);
    try { sessionStorage.setItem(LEAD_KEY, JSON.stringify(lead)); } catch {}
  };

  const startTour = () => {
    setTourActive(true);
    setTourStep(0);
  };

  const completeTour = () => {
    setTourActive(false);
  };

  const enterDemo = (lead?: DemoLead) => {
    setIsDemoMode(true);
    try { sessionStorage.setItem(DEMO_KEY, 'true'); } catch {}
    if (lead) {
      setDemoLead(lead);
      startTour();
    }
  };

  const exitDemo = () => {
    setIsDemoMode(false);
    setDemoLeadState(null);
    setTourActive(false);
    try {
      sessionStorage.removeItem(DEMO_KEY);
      sessionStorage.removeItem(LEAD_KEY);
    } catch {}
  };

  const companyName = useMemo(() => demoLead?.companyName || 'Pacific Coast Dining', [demoLead]);
  const userName = useMemo(() => demoLead?.fullName || 'James Wilson', [demoLead]);
  const firstName = useMemo(() => userName.split(' ')[0], [userName]);

  return (
    <DemoContext.Provider value={{
      isDemoMode, enterDemo, exitDemo,
      demoLead, setDemoLead,
      tourActive, tourStep, setTourStep,
      startTour, completeTour,
      companyName, userName, firstName,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
