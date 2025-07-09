diff --git a//dev/null b/README.md
index 0000000000000000000000000000000000000000..811299e9d921af82d3b1d3960239bbc79189d5f1 100644
--- a//dev/null
+++ b/README.md
@@ -0,0 +1,34 @@
+# Burger Bot
+
+This project is a conversational bot for a burger shop. It uses WhatsApp and the OpenAI API to take orders, answer questions about ingredients and the menu, and generally act like one of the shop's employees. The bot supports up to 13 employees and handles natural, flexible conversations with customers just like a real fast‑food chain assistant.
+
+## Prerequisites
+
+- **Node.js** version 18 or later.
+- Environment variables configured in a `.env` file:
+  - `OPENAI_API_KEY` – your OpenAI API key.
+  - `MERCADO_PAGO_ACCESS_TOKEN` – token for Mercado Pago.
+
+Install dependencies with:
+
+```bash
+npm install
+```
+
+## Starting the bot
+
+Run the bot with:
+
+```bash
+npm start
+```
+
+On startup, the terminal will show a QR code. Scan this QR code with your WhatsApp application to connect the bot to your account.
+
+## Data storage
+
+Orders are saved locally in `pedidos.json`. Each time a user interacts with the bot, their order data is updated in this file.
+
+## Connecting via WhatsApp
+
+The bot uses the **Baileys** library to connect to WhatsApp. When you run the bot, it prints a QR code in the terminal. Open WhatsApp on your phone, choose the option to link a device, and scan the QR code to start chatting with the bot.

