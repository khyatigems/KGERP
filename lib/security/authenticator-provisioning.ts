import QRCode from "qrcode";

export function authenticatorUri(email: string, secret: string) {
  const issuer = "KhyatiGems ERP";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

/** Four clear modules on every side; integer scaling keeps source modules sharp. */
export function renderAuthenticatorQr(uri: string) {
  return QRCode.toDataURL(uri, {
    margin: 4,
    scale: 8,
    errorCorrectionLevel: "M",
    color: { dark: "#000000ff", light: "#ffffffff" },
  });
}
