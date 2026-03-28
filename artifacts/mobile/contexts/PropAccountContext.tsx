import React, { createContext, useContext } from "react";
import { useGetPropAccount } from "@workspace/api-client-react";

interface PropAccountContextValue {
  balance: number;
  startingBalance: number;
  dailyLoss: number;
  maxDailyLoss: number;
  maxTotalLoss: number;
  hasAccount: boolean;
  refetch: () => void;
}

const PropAccountContext = createContext<PropAccountContextValue | null>(null);

export function PropAccountProvider({ children }: { children: React.ReactNode }) {
  const { data: account, refetch } = useGetPropAccount();

  const hasAccount = !!account;
  const balance = account?.currentBalance ?? 50000;
  const startingBalance = account?.startingBalance ?? 50000;
  const dailyLoss = account?.dailyLoss ?? 0;
  const maxDailyLoss = account?.maxDailyLossPct ?? 2;
  const maxTotalLoss = account?.maxTotalDrawdownPct ?? 10;

  return (
    <PropAccountContext.Provider
      value={{ balance, startingBalance, dailyLoss, maxDailyLoss, maxTotalLoss, hasAccount, refetch }}
    >
      {children}
    </PropAccountContext.Provider>
  );
}

export function usePropAccount(): PropAccountContextValue {
  const ctx = useContext(PropAccountContext);
  if (!ctx) throw new Error("usePropAccount must be used within PropAccountProvider");
  return ctx;
}
