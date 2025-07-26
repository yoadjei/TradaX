// src/stores/WalletContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { walletApi } from '@tradax/utils';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [balances, setBalances] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [usdBalance, setUsdBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchBalances = useCallback(async () => {
    setLoading(true);
    try {
      const res = await walletApi.getBalances?.();
      const b = Array.isArray(res?.balances) ? res.balances : [];
      setBalances(b);
      setTotalValue(Number(res?.totalValue) || 0);
      setUsdBalance(Number(res?.usd ?? res?.cash ?? res?.fiat ?? 0));
    } finally {
      setLoading(false);
    }
  }, []);

  const deposit = useCallback(async ({ asset, amount }) => {
    await walletApi.deposit?.({ asset, amount });
    await fetchBalances();
  }, [fetchBalances]);

  const withdraw = useCallback(async ({ asset, amount }) => {
    await walletApi.withdraw?.({ asset, amount });
    await fetchBalances();
  }, [fetchBalances]);

  const trade = useCallback(async (payload) => {
    await walletApi.trade?.(payload);
    await fetchBalances();
  }, [fetchBalances]);

  const value = {
    balances,
    totalValue,
    usdBalance,
    loading,
    fetchBalances,
    deposit,
    withdraw,
    trade,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
