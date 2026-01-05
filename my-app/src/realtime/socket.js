import { io } from "socket.io-client";

// ✅ URL nga .env ose fallback IP
const SOCKET_URL =
  import.meta.env.VITE_API_URL || "http://192.168.100.71:5000";

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: true,
});
