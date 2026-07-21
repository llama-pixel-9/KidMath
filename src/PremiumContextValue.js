import { createContext } from "react";

export const PremiumContext = createContext({
  isPremium: false,
  loading: true,
  refresh: () => {},
  openPaywall: () => {},
});
