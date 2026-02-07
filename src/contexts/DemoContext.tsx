import { createContext, useContext, useState, ReactNode } from 'react';

interface DemoContextType {
  isDemoMode: boolean;
  enterDemo: () => void;
  exitDemo: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const DEMO_KEY = 'evidly_demo_mode';

export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(() => {
    try {
      return sessionStorage.getItem(DEMO_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const enterDemo = () => {
    setIsDemoMode(true);
    try { sessionStorage.setItem(DEMO_KEY, 'true'); } catch {}
  };

  const exitDemo = () => {
    setIsDemoMode(false);
    try { sessionStorage.removeItem(DEMO_KEY); } catch {}
  };

  return (
    <DemoContext.Provider value={{ isDemoMode, enterDemo, exitDemo }}>
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
