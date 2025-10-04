// api/lib/mfa.js
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

function generateTOTPSecret(email) {
  return speakeasy.generateSecret({
    name: `${process.env.MFA_ISSUER || "Pramara PMS"}:${email}`,
    length: 20,
  });
}

async function secretToDataURL(otpauthUrl) {
  return await QRCode.toDataURL(otpauthUrl);
}

function verifyTOTP(token, base32) {
  return speakeasy.totp.verify({
    secret: base32,
    encoding: "base32",
    token,
    window: 1,
  });
}

module.exports = {
  generateTOTPSecret,
  secretToDataURL,
  verifyTOTP,
};
