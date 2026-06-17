'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { UpgradeModal } from './upgrade-modal';

const UpgradeContext = createContext<{ open: () => void } | null>(null);

/** Provides a global upgrade modal that any client component can open (e.g. on a limit hit). */
export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  return (
    <UpgradeContext.Provider value={{ open }}>
      {children}
      <UpgradeModal open={isOpen} onClose={() => setIsOpen(false)} />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade(): { open: () => void } {
  return useContext(UpgradeContext) ?? { open: () => {} };
}
