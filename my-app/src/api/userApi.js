// src/api/userApi.js
import { api } from "./http.js";

// LOGIN USER (manager / waiter)
export const loginUserApi = async (username, password) => {
  const res = await api.post("/users/login", {
    username: (username || "").trim(),
    password: (password || "").trim(),
  });

  return res.data; // { id, businessId, role, name, username }
};
