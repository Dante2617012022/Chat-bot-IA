# Burger Bot

This project is a conversational bot for a burger shop. It integrates with WhatsApp and the OpenAI API to take orders, answer ingredient questions, and act like a helpful employee. The bot supports up to 13 staff members and handles natural, flexible conversations with customers like a real fast-food assistant.

## Prerequisites

- **Node.js** 18 or later.
- Environment variables configured in a `.env` file:
  - `OPENAI_API_KEY` – your OpenAI API key.
  - `MERCADO_PAGO_ACCESS_TOKEN` – token for Mercado Pago.
- `STORE_ADDRESS` – optional store location sent to users asking for our address. When a user writes phrases like "dónde queda" or "cómo llego", the bot replies with this address (or a fallback message if not set).

Install dependencies with:

```bash
npm install
```
### Mercado Pago setup

Initialize the Mercado Pago client using the new SDK API:

```javascript
const { MercadoPagoConfig, Preference } = require('mercadopago');
const mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN });
const preferenceClient = new Preference(mpClient);
```

`preferenceClient` is later used to create payment links.
## Starting the bot

Run the bot with:

```bash
npm start
```

On startup, a QR code appears in the terminal. Scan it with WhatsApp to connect the bot to your account.

## Data storage

Orders are saved locally in `pedidos.json`. The bot creates this file automatically to persist conversations and order details between sessions, and it is ignored by Git so local data does not get committed.

## Connecting via WhatsApp

The bot uses the **Baileys** library to connect to WhatsApp. When you run the bot, it prints a QR code in the terminal. Open WhatsApp on your phone, choose the option to link a device, and scan the QR code to start chatting.

## License

This project is released under the [MIT License](LICENSE).

