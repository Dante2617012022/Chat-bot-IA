const { default: makeWASocket, useMultiFileAuthState } = require("baileys");
const OpenAI = require("openai");
const fs = require("fs");
require("dotenv").config();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
const { OPENAI_API_KEY, MERCADO_PAGO_ACCESS_TOKEN, STORE_ADDRESS } = process.env;
if (!OPENAI_API_KEY || !MERCADO_PAGO_ACCESS_TOKEN) {
  console.error(
    "Missing OPENAI_API_KEY or MERCADO_PAGO_ACCESS_TOKEN environment variables."
  );
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const mercadopago = require("mercadopago");

mercadopago.configure({
  access_token: MERCADO_PAGO_ACCESS_TOKEN
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
try {
    const data = fs.readFileSync("pedidos.json");
    pedidos = JSON.parse(data);
  } catch (err) {
    console.error("Error reading pedidos.json:", err);
    pedidos = [];
  }
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

 try {
      fs.writeFileSync("pedidos.json", JSON.stringify(pedidos, null, 2));
    } catch (err) {
      console.error("Error writing pedidos.json:", err);
    }

    await sock.sendMessage(sender, { text: respuesta });
  });
}

async function manejarMensaje(text, pedido) {
  const lower = text.toLowerCase();
  // Deriva a humano
    const palabrasHumano = [
  "humano", "Humano",
  "persona", "Persona",
  "alguien", "Alguien",
  "asesor", "Asesor",
  "atendedor", "Atendedor",
  "atencion humana", "Atencion humana",
  "atención humana", "Atención humana",
  "quiero hablar con alguien", "Quiero hablar con alguien",
  "quiero hablar con una persona", "Quiero hablar con una persona",
  "quiero un humano", "Quiero un humano",
  "quiero un asesor", "Quiero un asesor",
  "necesito un humano", "Necesito un humano",
  "necesito hablar con alguien", "Necesito hablar con alguien",
  "quiero un operador", "Quiero un operador",
  "necesito un operador", "Necesito un operador",
  "atencion personal", "Atencion personal",
  "atención personal", "Atención personal"
];
// Detecta solicitud de atención humana

if (palabrasHumano.some(p => lower.includes(p.toLowerCase()))) {
  await sock.sendMessage(sender, {
    text: "📞 Podés comunicarte con un humano al 3816460291."
  });
  return;
}
  // Detecta ubicación
    const palabrasUbicacion = [
  "ubicacion", "Ubicacion",
  "ubicación", "Ubicación",
  "donde estan", "Donde estan",
  "dónde están", "Dónde están",
  "direccion", "Direccion",
  "dirección", "Dirección",
  "local", "Local", "donde", "Donde",
  "sucursal", "Sucursal",
  "donde queda", "Donde queda",
  "dónde queda", "Dónde queda",
  "como llego", "Como llego",
  "cómo llego", "Cómo llego",
  "ubicados", "Ubicados",
  "direccion exacta", "Direccion exacta",
  "ubicacion exacta", "Ubicacion exacta",
  "ubicación exacta", "Ubicación exacta",
  "ubicacion del local", "Ubicacion del local",
  "como ir", "Como ir",
  "como llego al local", "Como llego al local"
];

  
  // Detecta solicitud de menú/carta
    const palabrasClave = [
  "menu", "Menu",
  "menue", "Menue",
  "menú", "Menú",
  "carta", "Carta",
  "catalogo", "Catalogo",
  "catálogo", "Catálogo",
  "listado", "Listado",
  "lista", "Lista",
  "precios", "Precios",
  "precio", "Precio",
  "productos", "Productos",
  "producto", "Producto",
  "oferta", "Oferta",
  "ofertas", "Ofertas",
  "promocion", "Promocion",
  "promoción", "Promoción",
  "promos", "Promos",
  "opciones", "Opciones",
  "opcion", "Opcion",
  "platos", "Platos",
  "plato", "Plato",
  "comidas", "Comidas",
  "bebidas", "Bebidas",
  "ver menu", "Ver menu",
  "quiero ver el menu", "Quiero ver el menu",
  "pasame el menu", "Pasame el menu",
  "dame el menú", "Dame el menú",
  "me das el menu por favor", "Me das el menu por favor",
  "me pasas el menu", "Me pasas el menu", "Me das el menu", "me das el menu","Me das el menu?",
  "dejame el menú", "Dejame el menú",
  "dejame el menu", "Dejame el menu",
  "dejame el menú a mano", "Dejame el menú a mano",
  "dejame el menu a mano por favor", "Dejame el menu a mano por favor",
  "dejame el menu a mano porfavor", "Dejame el menu a mano porfavor",
  "me pasas la carta", "Me pasas la carta",
  "quiero la carta", "Quiero la carta",
  "dame el menu", "Dame el menu",
  "mostrar menu", "Mostrar menu",
  "mostrar carta", "Mostrar carta"
];

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


}
  if (gptResult.pregunta_precio) {
    const prod = gptResult.pregunta_precio.toLowerCase();
    if (menu[prod]) {
      return `La ${capitalize(prod)} está $${menu[prod]}. ¿Querés sumar una al pedido?`;
    }
  }
  // Detecta consulta por precios
    const palabrasPrecios = [
  "precio", "Precio",
  "precios", "Precios",
  "vale", "Vale",
  "cuanto", "Cuanto",
  "cuánto", "Cuánto",
  "valor", "Valor",
  "cuestan", "Cuestan",
  "cuesta", "Cuesta",
  "sale", "Sale",
  "salen", "Salen",
  "tarifa", "Tarifa",
  "importe", "Importe",
  "que vale", "Que vale",
  "que cuesta", "Que cuesta",
  "que sale", "Que sale",
];
// Mostrar menú si se detecta una frase relacionada
  for (const palabra of palabrasClave) {
    if (lower.includes(palabra.toLowerCase())) {
      return saludoDinamico(pedido) + `\nTe paso nuestro menú completo 👇\n\n${menuToString()}`;
    }
  }
  if (lower.includes("pagar") || lower.includes("link")) {
    const link = await generarLinkPago(pedido);
    pedido.pagado = true;
    return `👉 Te paso el link de pago (Mercado Pago):\n${link}\nCuando completes el pago avisame y lo confirmo 😉`;
  }
const palabrasPedido = [
    "vender", "Vender",
    "hola me podria preparar", "Hola me podria preparar",
    "hola me podría preparar", "Hola me podría preparar",
    "hola que tal! me pepara", "Hola que tal! me pepara",
    "hola que tal! me preparas", "Hola que tal! me preparas",
    "hola que tal! me podrías preparar", "Hola que tal! me podrías preparar",
    "hola como va, me podrías preparar", "Hola como va, me podrías preparar",
    "hola que tal, me podrías preparar", "Hola que tal, me podrías preparar",
    "hola como va! me podrías preparar", "Hola como va! me podrías preparar",
    "hola que tal! me podrias preparar", "Hola que tal! me podrias preparar",
    "me vendes", "Me vendes",
    "solicito", "Solicito",
    "te solicito", "Te solicito",
    "quiero pedir", "Quiero pedir",
    "pedido", "Pedido",
    "encargar", "Encargar",
    "te encargo", "Te encargo",
    "quisiera pedir", "Quisiera pedir",
    "me comercializas", "Me comercializas",
    "te ordeno", "Te ordeno",
    "me podrias preparar", "Me podrias preparar",
    "me podrías preparar", "Me podrías preparar",
    "me podrían preparar", "Me podrían preparar",
    "me podría preparar", "Me podría preparar",
    "quiero encargar", "Quiero encargar",
    "hago un pedido", "Hago un pedido",
    "me gustaría pedir", "Me gustaría pedir",
    "necesito pedir", "Necesito pedir",
    "quisiera encargar", "Quisiera encargar",
    "voy a pedir", "Voy a pedir",
    "dame", "Dame",
    "ordenar", "Ordenar",
    "orden", "Orden",
    "pido", "Pido",
    "quisiera una", "Quisiera una",
    "quiero una", "Quiero una",
    "te pido", "Te pido",
    "me das", "Me das",
    "quiero comprar", "Quiero comprar",
    "comerciar", "Comerciar",
    "me comercias", "Me comercias",
    "comprar", "Comprar",
    "me podria preparar porfis", "Me podria preparar porfis",
    "me podria preparar porfa", "Me podria preparar porfa",
    "me podria preparar porfavor", "Me podria preparar porfavor",
    "me podria preparar por favor", "Me podria preparar por favor",
    "requerir", "Requerir",
    "requiero", "Requiero",
    "solicitar", "Solicitar",
    "tendria para preparar", "Tendria para preparar",
    "preparame porfavor", "Preparame porfavor",
    "voy a encargar", "Voy a encargar",
    "me apetece", "Me apetece",
    "necesitaria", "Necesitaria",
    "desearia solicitar", "Desearia solicitar",
    "desearia pedir", "Desearia pedir",
    "se me antoja", "Se me antoja"
  ];
  if (palabrasPedido.some(p => lower.includes(p.toLowerCase()))) {
    if (pedido.items.length === 0 && pedido.interacciones === 1) {
      return saludoDinamico(pedido) + `\nTe paso nuestro menú rápido:\n\n${menuToString()}\nDecime qué se te antoja 😎`;
    } else {
      return `Ups, no logré entender bien. ¿Podrías repetirlo o explicarme mejor? 😊`;
    }
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

try {
    const mp = await mercadopago.preferences.create(preference);
    return mp.body.init_point;
  } catch (err) {
    console.error("Error creating MercadoPago preference:", err);
    throw err;
  }
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

