import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedBusinesses, type Business } from '@/lib/db';

interface BusinessContextValue {
  businesses: Business[];
  activeBusiness: Business | null;   // null = "All Businesses"
  setActiveBusinessId: (id: number | null) => void;
  activeBusinessId: number | null;
}

const BusinessContext = createContext<BusinessContextValue | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [activeBusinessId, setActiveBusinessId] = useState<number | null>(null);

  useEffect(() => {
    seedBusinesses();
  }, []);

  const businesses = useLiveQuery(() => db.businesses.toArray()) ?? [];
  const activeBusiness = activeBusinessId
    ? businesses.find(b => b.id === activeBusinessId) ?? null
    : null;

  return (
    <BusinessContext.Provider value={{ businesses, activeBusiness, activeBusinessId, setActiveBusinessId }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
