import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  window.location.origin;

/**
 * Token-i lexohet në ÇDO tentativë lidhjeje (auth si funksion),
 * kështu që pas login-it mjafton një refreshSocketAuth() dhe
 * socket-i rilidhet me JWT-në e re.
 *
 * - Manager / Waiter / Admin: kanë token => hyjnë te room-i privat i biznesit.
 * - Klientët e QR-së (guests): s'kanë token => vetëm room-i publik
 *   (marrin vetëm "products:changed", jo fatura apo xhiro).
 */
const readToken = () =>
  (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token") ||
    ""
  ).trim();

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
  autoConnect: true,
  auth: (cb) => cb({ token: readToken() }),
});

/**
 * Thirre pas login-it (pasi token-i të jetë ruajtur në storage)
 * dhe pas logout-it (pasi token-i të jetë fshirë), që handshake-u
 * të ribëhet me gjendjen e re.
 */
export function refreshSocketAuth() {
  if (socket.connected) {
    socket.disconnect();
  }

  socket.connect();
}