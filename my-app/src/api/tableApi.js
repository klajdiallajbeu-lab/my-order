import { api } from "./http";

export const getOpenTablesApi = async () => {
  const { data } = await api.get("/tables/open");
  return data;
};

export const addOrderToTableApi = async (payload) => {
  const { data } = await api.post("/tables/order", payload);
  return data;
};

export const closeTableApi = async (id) => {
  const { data } = await api.patch(`/tables/close/${id}`);
  return data;
};

export const getTableInvoiceApi = async (id) => {
  const { data } = await api.get(`/tables/invoice/${id}`);
  return data;
};

export const closeShiftApi = async () => {
  const { data } = await api.post("/tables/close-shift");
  return data;
};