import { api } from "./http.js";

export const getExchangeApi = async ({ businessId, base = "EUR", quote = "ALL" }) => {
  const { data } = await api.get(`/exchange`, { params: { businessId, base, quote } });
  return data;
};

export const setExchangeApi = async ({ businessId, base = "EUR", quote = "ALL", rate }) => {
  const { data } = await api.put(`/exchange`, { businessId, base, quote, rate });
  return data;
};
