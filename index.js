const { default: makeWASocket, useMultiFileAuthState } = require("baileys");
const OpenAI = require("openai");
const stringSimilarity = require("string-similarity");
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
const { MercadoPagoConfig, Preference } = require("mercadopago");

const mpClient = new MercadoPagoConfig({
  accessToken: MERCADO_PAGO_ACCESS_TOKEN
});
const preferenceClient = new Preference(mpClient);
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
// 👉 Función para remover artículos comunes
function removerArticulos(texto) {
  return texto
    .split(/\s+/)
    .filter(t => !["el", "la", "los", "las", "un", "una", "unos", "unas"].includes(t))
    .join(" ");
}
// 👉 Función para buscar el producto más parecido
function encontrarProductoSimilar(texto) {
  const productos = Object.keys(menu);
const consulta = removerArticulos(texto.toLowerCase());
  const coincidencias = stringSimilarity.findBestMatch(consulta, productos);
  const mejorCoincidencia = coincidencias.bestMatch;

  if (mejorCoincidencia.rating > 0.6) {
    return mejorCoincidencia.target;
  } else {
    console.log(`🔎 Sin coincidencia suficiente para: "${texto}" (score: ${mejorCoincidencia.rating})`);
    return null;
  }
}
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

let respuesta = await manejarMensaje(text, pedido);
    if (typeof respuesta !== "string" || respuesta.trim() === "") {
      respuesta = "No entendí, ¿podés repetirlo?";
    }


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
  return "📞 Podés comunicarte con un humano al 3816460291.";
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

  if (palabrasUbicacion.some(p => lower.includes(p.toLowerCase()))) {
    return STORE_ADDRESS || "Ubicación no configurada";
  }

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
if (palabrasClave.some(p => lower.includes(p.toLowerCase()))) {
  return `📋 Este es nuestro menú completo:\n\n${menuToString()}`;
}
  const todoMenos = lower.match(/todo\s+menos\s+(.+)/i);
  if (todoMenos) {
    const filtro = todoMenos[1].replace(/[.!?,;]+$/, '').trim();
    const keepTerm = (encontrarProductoSimilar(filtro) || filtro).toLowerCase();
    let cambios = false;
    pedido.items = pedido.items.filter(i => {
      const nombre = i.producto.toLowerCase();
      const keep = nombre.includes(keepTerm) ||
                   stringSimilarity.compareTwoStrings(nombre, keepTerm) > 0.4;
      if (!keep) {
        pedido.total -= i.subtotal;
        cambios = true;
      }
      return keep;
    });
    if (cambios) {
      let resumen = "Perfecto 👌 Tu pedido hasta ahora:\n";
      pedido.items.forEach(i => {
        resumen += `✅ ${i.cantidad} x ${i.producto} - $${i.subtotal}\n`;
      });
      resumen += `\n💵 Total: $${pedido.total}\n`;
      resumen += "¿Querés agregar algo más o generar el link de pago?";
      return resumen;
    }
  }
  // Detectar frases para reiniciar el pedido
  const reiniciar = /\b(?:nuevo\s+pedido|cancel(?:ar)?\s+todo|reiniciar\s+pedido|cancel(?:ar)?\s+pedido|anular\s+pedido|resetear\s+pedido|cancel(?:a|á)\s+la\s+orden)\b/i;
  if (reiniciar.test(lower)) {
    pedido.items = [];
    pedido.total = 0;
    return "Listo, empezamos un nuevo pedido. ¿Qué te gustaría pedir?";
  }
  // Detectar "borra todo" para vaciar el pedido
  const borrarTodo = /\b(?:borra(?:r|me|le)?|elimina(?:r|me|le)?|quita(?:r|me|le)?|saca(?:r|me|le)?|remueve|remove|anula(?:r)?)\s+todo\b/i;
  if (borrarTodo.test(lower) && !/todo\s+menos/i.test(lower)) {
    pedido.items = [];
    pedido.total = 0;
    let resumen = "Perfecto 👌 Tu pedido hasta ahora:\n";
    pedido.items.forEach(i => {
      resumen += `✅ ${i.cantidad} x ${i.producto} - $${i.subtotal}\n`;
    });
    resumen += `\n💵 Total: $${pedido.total}\n`;
    resumen += "¿Querés agregar algo más o generar el link de pago?";
    return resumen;
  }
  
  
  // Detectar frases como "borra", "elimina", "saca" o "quita" seguidas de un producto
  const borrarMatch = text.match(/\b(?:borra(?:r|me|le)?|elimina(?:r|me|le)?|quita(?:r|me|le)?|saca(?:r|me|le)?|remueve|remove)\s+(.+)/i);
  if (borrarMatch) {
    let prodTexto = borrarMatch[1].replace(/[.!?,;]+$/, '').trim();
    prodTexto = prodTexto.replace(/^(?:la|las|el|los)\s+/i, '');
    let cantidadEliminar = null;
    const cantMatch = prodTexto.match(/^(\d+)\s+(.+)/);
    if (cantMatch) {
      cantidadEliminar = parseInt(cantMatch[1], 10);
      prodTexto = cantMatch[2];
    }
const prodLower = prodTexto.toLowerCase();
    let coincidencia = null;
    const matches = pedido.items.filter(i => {
      const nombre = i.producto.toLowerCase();
      return nombre.includes(prodLower) ||
             stringSimilarity.compareTwoStrings(nombre, prodLower) > 0.4;
    });
    if (matches.length === 1) {
      coincidencia = matches[0].producto;
    } else if (matches.length > 1) {
      const opciones = matches.map(m => m.producto).join(', ');
      return `🤔 Encontré varios productos en tu pedido que coinciden: ${opciones}. ¿Cuál querés eliminar exactamente?`;
    }
    if (!coincidencia) {
      coincidencia = encontrarProductoSimilar(prodLower);
    }
    if (!coincidencia) {
      coincidencia = Object.keys(menu).find(p => p.toLowerCase().includes(prodLower));
    }
    if (coincidencia) {
      const nombreCapitalizado = capitalize(coincidencia);
      const idx = pedido.items.findIndex(i => i.producto.toLowerCase() === coincidencia.toLowerCase() ||
                                             i.producto.toLowerCase() === nombreCapitalizado.toLowerCase());
      if (idx !== -1) {
        const item = pedido.items[idx];
        const quitar = cantidadEliminar ? Math.min(cantidadEliminar, item.cantidad) : item.cantidad;
        item.cantidad -= quitar;
        const resta = quitar * item.precio_unitario;
        item.subtotal -= resta;
        pedido.total -= resta;
        if (item.cantidad <= 0) {
          pedido.items.splice(idx, 1);
        }
        let resumen = "Perfecto 👌 Tu pedido hasta ahora:\n";
        pedido.items.forEach(i => {
          resumen += `✅ ${i.cantidad} x ${i.producto} - $${i.subtotal}\n`;
        });
        resumen += `\n💵 Total: $${pedido.total}\n`;
        resumen += "¿Querés agregar algo más o generar el link de pago?";
        return resumen;
      }
    }
  }
  // Detectar frases como "agrega" o "sumale" seguidas de un producto
  const agregarMatch = text.match(/\b(?:agrega(?:r|me|le)?|sumale?|añade|anade|pon(?:e|me|le)?|adiciona)\s+(\d+)?\s*(.+)/i);
  if (agregarMatch) {
    const cantidad = agregarMatch[1] ? parseInt(agregarMatch[1], 10) : 1;
    let prodTexto = agregarMatch[2].replace(/[.!?,;]+$/, '').trim();
    prodTexto = prodTexto.replace(/^(?:la|las|el|los|un|una|unos|unas)\s+/i, '');
    let coincidencia = encontrarProductoSimilar(prodTexto.toLowerCase());
    if (!coincidencia) {
      const prodLower = prodTexto.toLowerCase();
      coincidencia = Object.keys(menu).find(p => p.toLowerCase().includes(prodLower));
    }
    if (coincidencia) {
      const nombreCapitalizado = capitalize(coincidencia);
      const precioUnitario = menu[coincidencia];
      const subtotal = cantidad * precioUnitario;
      const existente = pedido.items.find(i => i.producto.toLowerCase() === coincidencia.toLowerCase() ||
                                 i.producto.toLowerCase() === nombreCapitalizado.toLowerCase());
      if (existente) {
        existente.cantidad += cantidad;
        existente.subtotal += subtotal;
      } else {
        pedido.items.push({
          producto: nombreCapitalizado,
          cantidad,
          precio_unitario: precioUnitario,
          subtotal
        });
      }
      pedido.total += subtotal;
      let resumen = "Perfecto 👌 Tu pedido hasta ahora:\n";
      pedido.items.forEach(i => {
        resumen += `✅ ${i.cantidad} x ${i.producto} - $${i.subtotal}\n`;
      });
      resumen += `\n💵 Total: $${pedido.total}\n`;
      resumen += "¿Querés agregar algo más o generar el link de pago?";
      return resumen;
    }
  }
  // Detectar intención con GPT-4o usando memoria
  const gptResult = await module.exports.procesarConGPT(pedido);
  
if (gptResult.ofrecer_menu) {
  return `${saludoDinamico(pedido)} ¿Querés que te muestre el menú completo?`;
}

if (gptResult.mostrar_menu) {
  return `📋 Este es nuestro menú completo:\n\n${menuToString()}`;
}

  if (gptResult.cierre_pedido) {
    const link = await generarLinkPago(pedido);
    pedido.pagado = true;
    return `¡Perfecto! Entonces lo dejamos así. Te paso el link de pago:\n${link}\nCuando completes el pago avisame y lo confirmo 😉`;
  }
// 👉 Detectar si preguntó el precio de un producto
if (gptResult.pregunta_precio) {
  const prod = gptResult.pregunta_precio.toLowerCase();
  const coincidencia = encontrarProductoSimilar(prod);
  if (coincidencia) {
    return `💰 La ${capitalize(coincidencia)} cuesta $${menu[coincidencia]}. ¿Querés agregar una al pedido?`;
  } else {
    return "🤔 No encontré ese producto. ¿Podés repetirlo?";
  }
}
let cambios = false;

  if (gptResult.productos.length > 0) {
    cambios = true;
    gptResult.productos.forEach(p => {
      const nombreNormalizado = p.nombre.toLowerCase();
      const coincidencia = encontrarProductoSimilar(nombreNormalizado);
      if (coincidencia) {
        const nombreCapitalizado = capitalize(coincidencia);
        const precioUnitario = menu[coincidencia];
        const subtotal = p.cantidad * precioUnitario;

      // 🔄 Revisar si ya existe el producto en el pedido
      const yaExiste = pedido.items.find(i => i.producto === nombreCapitalizado);
      if (yaExiste) {
        yaExiste.cantidad += p.cantidad;
        yaExiste.subtotal += subtotal;
      } else {
        pedido.items.push({
          producto: nombreCapitalizado,
          cantidad: p.cantidad,
          precio_unitario: precioUnitario,
          subtotal
        });
      }

      pedido.total += subtotal;
    } else {
      console.log(`❌ No se reconoció el producto: "${p.nombre}"`);
    }
    });
  }
  if (gptResult.eliminar_productos && gptResult.eliminar_productos.length > 0) {
    cambios = true;
    gptResult.eliminar_productos.forEach(p => {
      if (!p) return;
      const nombreNormalizado = (p.nombre || p).toString().toLowerCase();
      const cantidadEliminar = p.cantidad;
      const coincidencia = encontrarProductoSimilar(nombreNormalizado);
      if (coincidencia) {
        const nombreCapitalizado = capitalize(coincidencia);
        const idx = pedido.items.findIndex(i => i.producto === nombreCapitalizado);
        if (idx !== -1) {
          const item = pedido.items[idx];
          const quitar = cantidadEliminar ? Math.min(cantidadEliminar, item.cantidad) : item.cantidad;
          item.cantidad -= quitar;
          const resta = quitar * item.precio_unitario;
          item.subtotal -= resta;
          pedido.total -= resta;
          if (item.cantidad <= 0) {
            pedido.items.splice(idx, 1);
          }
        }
      }
    });
  }

  if (cambios) {
    let resumen = "Perfecto 👌 Tu pedido hasta ahora:\n";
    pedido.items.forEach(i => {
      resumen += `✅ ${i.cantidad} x ${i.producto} - $${i.subtotal}\n`;
    });
    resumen += `\n💵 Total: $${pedido.total}\n`;
    resumen += "¿Querés agregar algo más o generar el link de pago?";

    return resumen; // 👈 muy importante: devuelve el mensaje al usuario
  }







  }
let procesarConGPT = async function(pedido) {
  const historialGPT = [
  { role: "system", content: `
Sos un asistente de Camdis, una hamburguesería.

Tu tarea es:
✅ Armar pedidos a partir de lo que el cliente dice (productos y cantidades).
✅ Detectar si el cliente pregunta por el precio de algún producto.
✅ Detectar si el cliente cierra el pedido (frases como "listo eso es todo", "nada más gracias").
✅ Sugerir agregados si el cliente duda.
✅ Podés ofrecer ayuda si el cliente parece confundido.
✅ Detectar si el cliente quiere *quitar* o *eliminar* productos del pedido y listarlos en "eliminar_productos".

🧠 Si el cliente recién inicia la conversación con un saludo o algo general, respondé de forma simpática y preguntale si quiere que le muestres el menú. En ese caso devolvé: "ofrecer_menu": true.

✅ Si el cliente responde que sí, devolvé: "mostrar_menu": true.

📦 Formato JSON (respondé **solo esto**):
{
  "productos": [{"nombre": "...", "cantidad": ...}],
  "pregunta_precio": "...",
  "cierre_pedido": true/false,
  "ofrecer_menu": true/false,
  "mostrar_menu": true/false,
  "eliminar_productos": [{"nombre": "...", "cantidad": ...}]
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
 return { productos: [], pregunta_precio: null, cierre_pedido: false, ofrecer_menu: false, mostrar_menu: false, eliminar_productos: [] };
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
    const mp = await preferenceClient.create({ body: preference });
    return mp.init_point;
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

if (require.main === module) {
  startBot();
}
module.exports = { manejarMensaje, procesarConGPT, menu };

