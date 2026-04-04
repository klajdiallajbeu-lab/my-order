// utils/makeToken.js
const crypto = require("crypto");
module.exports = function makeToken(len = 16) {
  // 16 bytes -> 32 chars hex
  return crypto.randomBytes(len).toString("hex");
};
