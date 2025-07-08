const { default: makeWASocket, useMultiFileAuthState } = require("baileys");
const OpenAI = require("openai");
const fs = require("fs");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const mercadopago = require("mercadopago");

mercadopago.configure({
  access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN
});

const menu = {
  "Cheeseburger simple": 8000,
  "Cheeseburger doble": 9500,
  "Cheeseburger triple": 12000,
  "Bacon cheese simple": 8500,
  "Bacon cheese doble": 10000,
  "Bacon cheese triple": 12000,
  "Cuarto A simple": 8000,
  "Cuarto A doble": 9500,
  "Cuarto A triple": 12000,
  "Americana 2.0 simple": 8500,
  "Americana 2.0 doble": 10000,
  "Americana 2.0 triple": 12000,
  "Big camdis simple": 8500,
  "Big camdis doble": 10000,
  "Big camdis triple": 12000,
  "Camdis crispy simple": 8500,
  "Camdis crispy doble": 10000,
  "Camdis crispy triple": 12000,
  "Araka simple": 8500,
  "Araka doble": 9500,
  "Araka triple": 12000,
  "Triple l simple": 8500,
  "Triple l doble": 10000,
  "Triple l triple": 12500,
  "Onion simple": 8500,
  "Onion doble": 9500,
  "Onion triple": 12000,
  "Nuggets x6": 3000,
  "Nuggets x12": 5500,
  "Papas clasicas": 6000,
  "Papas gratinadas": 8000,
  "Papas americanas": 10000,
  "Queso extra": 1000,
  "Bacon extra": 1000,
  "Papas extra": 2500,
  "Carne extra": 2300,
  "Salsa extra": 500,
  "Lata": 1800,
  "1.5l": 3500
};

let pedidos = [];
if (fs.existsSync("pedidos.json")) {
  pedidos = JSON.parse(fs.readFileSync("pedidos.json"));
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_camdis");
  const sock = makeWASocket({ auth: state });

const qrcode = require("qrcode-terminal");
  sock.ev.on("connection.update", (update) => {
    const { qr } = update;
    if (qr) {
      console.log("📌 Escaneá el QR para conectar el bot:");
      qrcode.generate(qr, { small: true });
    }
  });



  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    
    if (sender.endsWith("@g.us")) return;
    
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    let pedido = pedidos.find(p => p.cliente === sender && !p.pagado);
    if (!pedido) {
      pedido = { 
        cliente: sender, 
        items: [], 
        total: 0, 
        pagado: false, 
        historial: [],
        interacciones: 0
      };
    }

    pedido.interacciones++;
    pedido.historial.push({ role: "user", content: text });

    const respuesta = await manejarMensaje(text, pedido);

    pedido.historial.push({ role: "assistant", content: respuesta });

    pedidos = pedidos.filter(p => p.cliente !== sender || p.pagado);
    pedidos.push(pedido);

    fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2));

    await sock.sendMessage(sender, { text: respuesta });
  });
}

async function manejarMensaje(text, pedido) {
  const lower = text.toLowerCase();

  // Detectar intención con GPT-4o usando memoria
  const gptResult = await procesarConGPT(pedido);

  if (gptResult.cierre_pedido) {
    const link = await generarLinkPago(pedido);
    pedido.pagado = true;
    return `¡Perfecto! Entonces lo dejamos así. Te paso el link de pago:\n${link}\nCuando completes el pago avisame y lo confirmo 😉`;
  }

  if (gptResult.productos.length > 0) {
    gptResult.productos.forEach(p => {
      if (menu[p.nombre.toLowerCase()]) {
        pedido.items.push({
          producto: capitalize(p.nombre),
          cantidad: p.cantidad,
          precio_unitario: menu[p.nombre.toLowerCase()],
          subtotal: p.cantidad * menu[p.nombre.toLowerCase()]
        });
        pedido.total += p.cantidad * menu[p.nombre.toLowerCase()];
      }
    });

    let resumen = "Perfecto 👌 Tu pedido hasta ahora:\n";
    pedido.items.forEach(i => {
      resumen += `✅ ${i.cantidad} x ${i.producto} - $${i.subtotal}\n`;
    });
    resumen += `\n💵 Total: $${pedido.total}\n`;
    resumen += "¿Querés agregar algo más o generar el link de pago?";


  if (gptResult.pregunta_precio) {
    const prod = gptResult.pregunta_precio.toLowerCase();
    if (menu[prod]) {
      return `La ${capitalize(prod)} está $${menu[prod]}. ¿Querés sumar una al pedido?`;
    }
  }

  if (lower.includes("pagar") || lower.includes("link")) {
    const link = await generarLinkPago(pedido);
    pedido.pagado = true;
    return `👉 Te paso el link de pago (Mercado Pago):\n${link}\nCuando completes el pago avisame y lo confirmo 😉`;
  }

  if (pedido.items.length === 0 && pedido.interacciones === 1) {
    return saludoDinamico(pedido) + `\nTe paso nuestro menú rápido:\n\n${menuToString()}\nDecime qué se te antoja 😎`;
  } else {
    return `Ups, no logré entender bien. ¿Podrías repetirlo o explicarme mejor? 😊`;
  }
}

async function procesarConGPT(pedido) {
  const historialGPT = [
    { role: "system", content: `
Sos un asistente de Camdis, una hamburguesería. 
Tu tarea es:
✅ Armar pedidos a partir de lo que el cliente dice (productos y cantidades).
✅ Responder preguntas comunes: recomendaciones, ingredientes, picante/no picante, demora estimada.
✅ Detectar si el cliente cierra el pedido (frases como "listo eso es todo", "nada más gracias").
✅ Sugerir agregados si el cliente duda.
✅ Podés ofrecer ayuda si el cliente parece confundido.

Respondé SOLO en JSON así:
{
  "productos": [{"nombre": "...", "cantidad": ...}],
  "pregunta_precio": "...",
  "cierre_pedido": true/false
}

Menú válido: ${Object.keys(menu).map(p => capitalize(p)).join(", ")}
` },
    ...pedido.historial.slice(-10)
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: historialGPT
  });

  try {
    const json = JSON.parse(completion.choices[0].message.content.trim());
    return json;
  } catch {
    return { productos: [], pregunta_precio: null, cierre_pedido: false };
  }
}

async function generarLinkPago(pedido) {
  const preference = {
    items: pedido.items.map(i => ({
      title: i.producto,
      quantity: i.cantidad,
      unit_price: i.precio_unitario
    }))
  };

  const mp = await mercadopago.preferences.create(preference);
  return mp.body.init_point;
}

function saludoDinamico(pedido) {
  const hora = new Date().getHours();
  let saludoHora = "¡Hola!";
  if (hora >= 6 && hora < 12) saludoHora = "¡Buen día!";
  else if (hora >= 12 && hora < 20) saludoHora = "¡Buenas tardes!";
  else saludoHora = "¡Buenas noches!";

  let extra = "";
  if (pedido.interacciones > 1) {
    extra = " ¡Qué bueno verte de nuevo!";
  }

  return `${saludoHora}${extra} ¿Almuerzo o cena hoy?`;
}

function menuToString() {
  return Object.entries(menu)
    .map(([name, price]) => `${capitalize(name)}: $${price}`)
    .join("\n");
}

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

startBot();

