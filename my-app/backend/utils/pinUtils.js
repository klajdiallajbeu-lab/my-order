// backend/utils/pinUtils.js

export function getTodayTirane() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Tirane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function generateRandomPin() {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  const numbers = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  return `${letter}${numbers}`; // A123
}
