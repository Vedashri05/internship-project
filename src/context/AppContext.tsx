import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Faculty, FairnessCounter, AllocationResult } from '@/types/exam';

interface AppState {
  isLoggedIn: boolean;
  login: (u: string, p: string) => boolean;
  logout: () => void;
  faculties: Faculty[];
  setFaculties: (f: Faculty[]) => void;
  counters: Map<string, FairnessCounter>;
  setCounters: (c: Map<string, FairnessCounter>) => void;
  allocationResult: AllocationResult | null;
  setAllocationResult: (r: AllocationResult | null) => void;
  currentTerm: string;
  setCurrentTerm: (t: string) => void;
  totalStudents: number;
  setTotalStudents: (n: number) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [counters, setCounters] = useState<Map<string, FairnessCounter>>(new Map());
  const [allocationResult, setAllocationResult] = useState<AllocationResult | null>(null);
  const [currentTerm, setCurrentTerm] = useState('2025-Spring');
  const [totalStudents, setTotalStudents] = useState(0);

  const login = (u: string, p: string) => {
    if (u === 'admin' && p === 'admin123') {
      setIsLoggedIn(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsLoggedIn(false);
  };

  return (
    <AppContext.Provider value={{
      isLoggedIn, login, logout,
      faculties, setFaculties,
      counters, setCounters,
      allocationResult, setAllocationResult,
      currentTerm, setCurrentTerm,
      totalStudents, setTotalStudents,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used inside AppProvider');
  return ctx;
}
