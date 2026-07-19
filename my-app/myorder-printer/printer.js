const { io } = require("socket.io-client");

const businessId = "TEST";

const socket = io("https://myorderal.com", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("🟢 Connected");

  document.getElementById("status").innerText =
    "🟢 Connected";

  socket.emit("joinBusiness", businessId);
});

socket.on("disconnect", () => {
  console.log("🔴 Disconnected");

  document.getElementById("status").innerText =
    "🔴 Disconnected";
});
