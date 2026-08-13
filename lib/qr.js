import QRCode from "qrcode";

// Server-side QR generation.
//
// Rendered into a data URI rather than fetched from an image service: the QR is
// the entire distribution mechanism for the product, and it must not depend on
// a third party being up on a Saturday evening. It also means the printable
// table cards work with no network at all.
//
// Error correction level M tolerates a smudge or a thumbprint on a printed card
// without becoming unscannable.
export async function qrDataUrl(url, { size = 512, margin = 2 } = {}) {
  try {
    return await QRCode.toDataURL(url, {
      width: size,
      margin,
      errorCorrectionLevel: "M",
      color: { dark: "#6B4E5E", light: "#FFFDF7" },
    });
  } catch {
    // A missing QR shouldn't take the console down — the link is still shown.
    return null;
  }
}
