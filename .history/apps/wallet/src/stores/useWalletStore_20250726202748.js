// stores/useWalletStore.js
import create from 'zustand';
import { walletApi } from '@tradax/utils';

export const useWalletStore = create((set, get) => ({
  balances: [],
  totalValue: 0,
  usdBalance: 0,
  loading: false,
  error: null,

  fetchBalances: async () => {
    set({ loading: true, error: null });
    try {
      const res = await walletApi.getBalances?.();
      const balances = Array.isArray(res?.balances) ? res.balances : [];
      const totalValue = Number(res?.totalValue) || 0;
      const usdBalance = Number(res?.usd ?? res?.cash ?? res?.fiat ?? 0); // fallback keys if your API uses another one
      set({ balances, totalValue, usdBalance, loading: false });
    } catch (e) {
      set({ error: e?.message || 'Failed to load balances', loading: false });
    }
  },

  deposit: async ({ asset, amount }) => {
    await walletApi.deposit?.({ asset, amount });
    await get().fetchBalances();
  },

  withdraw: async ({ asset, amount }) => {
    await walletApi.withdraw?.({ asset, amount });
    await get().fetchBalances();
  },

  trade: async (payload) => {
    await walletApi.trade?.(payload);
    await get().fetchBalances();
  },
}));
