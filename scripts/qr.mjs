import QRCode from "qrcode";

// Prints a QR code of the app URL with the device's lien in the fragment, so a phone can open a
// Cloudflare preview without typing the secret. The secret never leaves this terminal.
const [url] = process.argv.slice(2);
const secret = process.env.LIEN_SECRET;
if (!url || !secret) {
  console.error("Usage : LIEN_SECRET=<secret> pnpm qa:qr https://<preview>.ecureuil.pages.dev");
  process.exit(1);
}

const lien = `${url.replace(/\/?#.*$/, "").replace(/\/$/, "")}/#${secret}`;
console.log(await QRCode.toString(lien, { type: "terminal", small: true }));
console.log(`${url} (le secret est dans le fragment, pas affiché)`);
