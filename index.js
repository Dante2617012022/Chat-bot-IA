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

const frasesEliminarTodo = [
  "borrá todo", "borra todo", "anulá todo", "anula todo", "cancelá el pedido", 
  "cancelar todo", "nuevo pedido", "empezá de nuevo", "resetear pedido", "reiniciar",
  "empecemos de cero", "resetear todo", "limpiar pedido", "pedido nuevo"
];

const frasesSolicitarPago = [
  "quiero pagar", "pasame el link", "mandame el link", "generá el link", 
  "cobrámelo", "cobrame", "pagar", "link de pago", "finalizá", "cobrame ya", "cómo pago", "terminamos", "ya está", "finalizalo"
];

const frasesEliminarParcial = [
  "sacá", "saca", "restale", "quitá", "quita", "eliminá", "elimina", 
  "dejame", "dejá", "dejá solo", "dejá solamente", "dejame solo", "sacale", "bajale", "quitalo", "eliminalo", "quitame", "restame", "quita eso"
];


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
  // Verbos que disparan eliminación
const VERBOS_ELIMINAR = [
  "sacá","saca","quitá","quita","eliminá","elimina","borra","borrar","remove","restale","sacale", "bajale", "quitalo", "eliminalo", "quitame", "restame", "quita eso"
];

// Separadores de productos
const SEP_PRODUCTOS = /\s*(?:,| y | e )\s*/i;

// Conversión básica de números escritos en español a dígitos
const NUM_PALABRAS = {
  "un": 1, "uno": 1, "una": 1,
  "dos": 2,
  "tres": 3,
  "cuatro": 4,
  "cinco": 5,
  "seis": 6,
  "siete": 7,
  "ocho": 8,
  "nueve": 9,
  "diez": 10,
  "once": 11,
  "doce": 12,
  "trece": 13,
  "catorce": 14,
  "quince": 15,
  "dieciseis": 16, "dieciséis": 16,
  "diecisiete": 17,
  "dieciocho": 18,
  "diecinueve": 19,
  "veinte": 20
};

function reemplazarNumerosEscritos(texto) {
  const regex = new RegExp(`\\b(${Object.keys(NUM_PALABRAS).join("|")})\\b`, "gi");
  return texto.replace(regex, (m) => NUM_PALABRAS[m.toLowerCase()]);
}

/**
 * Parsea una frase que contenga una intención de ELIMINAR varios productos.
 * Devuelve: [{ nombre: "Americana 2.0 Doble", cantidad: 2|null }, ...]
 */
function parseEliminarMultiple(lower) {
  const regexVerbos = new RegExp(`\\b(${VERBOS_ELIMINAR.join("|")})\\b\\s+(.+)`, "i");
  const m = lower.match(regexVerbos);
  if (!m) return null;

  const cola = m[2].trim();
  const partes = cola.split(SEP_PRODUCTOS).map(s => s.trim()).filter(Boolean);

  const eliminaciones = partes.map(p => {
    const mm = p.match(/^(\d+)\s+(.+)$/);
    if (mm) {
      return { cantidad: parseInt(mm[1], 10), nombre: mm[2].trim() };
    }
    return { cantidad: null, nombre: p };
  });

  return eliminaciones;
}
const VERBOS_DEJAR_SOLO = [
  "dejame", "deja", "dejá", "dejar", "solamente", "solo", "únicamente"
];

// Detectar expresiones tipo: "dejame solo 3 latas", "dejá únicamente dos nuggets"
function parseEliminarTodoExcepto(lower) {
  const regex = /\b(dejame|dejá|deja)\b.*?\b(?:solo|solamente|únicamente)?\s*(\d+|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(.+)/i;
  const m = lower.match(regex);
  if (!m) return null;

  const cantidadTexto = m[2].trim();
  const nombre = m[3].trim();

  const cantidad = convertirTextoANumero(cantidadTexto);
  if (!cantidad || !nombre) return null;

  return { nombre, cantidad };
}
function convertirTextoANumero(palabra) {
  const mapa = {
    "uno": 1, "una": 1,
    "dos": 2,
    "tres": 3,
    "cuatro": 4,
    "cinco": 5,
    "seis": 6,
    "siete": 7,
    "ocho": 8,
    "nueve": 9,
    "diez": 10
  };
  if (!isNaN(palabra)) return parseInt(palabra);
  return mapa[palabra.toLowerCase()] || null;
}

/**
 * Aplica una lista de eliminaciones al pedido.
 */
function aplicarEliminacionesMultiples(pedido, eliminaciones) {
  let huboCambios = false;

  eliminaciones.forEach(({ nombre, cantidad }) => {
    const match = encontrarProductoSimilar(nombre)
      ?? Object.keys(menu).find(p => p.toLowerCase().includes(nombre.toLowerCase()));

    if (!match) return;

    const nombreCapitalizado = capitalize(match);
    const idx = pedido.items.findIndex(i => i.producto.toLowerCase() === match.toLowerCase());
    if (idx === -1) return;

    const item = pedido.items[idx];
    const quitar = cantidad ? Math.min(cantidad, item.cantidad) : item.cantidad;

    if (quitar > 0) {
      item.cantidad -= quitar;
      const resta = quitar * item.precio_unitario;
      item.subtotal -= resta;
      pedido.total -= resta;
      if (item.cantidad <= 0) {
        pedido.items.splice(idx, 1);
      }
      huboCambios = true;
    }
  });

  return huboCambios;
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
function mostrarPedido(pedido) {
  let resumen = "Perfecto 👌 Tu pedido hasta ahora:\n";
  pedido.items.forEach(i => {
    resumen += `✅ ${i.cantidad} x ${i.producto} - $${i.subtotal}\n`;
  });
  resumen += `\n💵 Total: $${pedido.total}\n`;
  resumen += "¿Querés agregar algo más o generar el link de pago?";
  return resumen;
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
  let lower = reemplazarNumerosEscritos(text.toLowerCase());
    let yaSeRespondio = false;
    
    const saludos = [
  "hola", "hola!", "hola!!", "hola como estas", "buenas", "buenas!", "buenas noches", 
  "buenas tardes", "buenos dias", "que tal", "cómo estás", "como estas"
];
 // Saludos
if (saludos.some(s => lower.includes(s))) {
  yaSeRespondio = true;
  return `${saludoDinamico(pedido)} ¿Querés que te muestre el menú completo?`;
}

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
  "como llego al local", "Como llego al local",
  "están en", "me pasás la dirección", "quiero saber dónde están", "como los encuentro", "Cómo los encuentro", "cómo los encuentro", "pasa dirección"
];

  if (palabrasUbicacion.some(p => lower.includes(p.toLowerCase()))) {
    return STORE_ADDRESS || "📍 Nuestra dirección: Uttinger, Gral. José de San Martín y, T4103 Tafí Viejo, Tucumán.";
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
  "mostrar carta", "Mostrar carta",
  "menues", "qué ofrecen", "qué tienen", "Qué tienen","Que tienen", "qué venden", "pasá la carta", "pasa el listado"
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
  // Detectar frases para reiniciar el pedido o eliminar todo
  const reiniciar = /\b(?:nuevo\s+pedido|cancel(?:ar)?\s+todo|anular\s+todo|cancel(?:a)?\s+todo|anula\s+todo|desaparece\s+todo|desaparecer\s+todo|reiniciar\s+pedido|cancel(?:ar)?\s+pedido|anular\s+pedido|resetear\s+pedido|cancel(?:a|á)\s+la\s+orden|resete(?:a|á)\s+la\s+orden|resetea(?:a|r)\s+la\s+orden)\b/i;
if (reiniciar.test(lower) || (frasesEliminarTodo.some(f => lower.includes(f)) && !/todo\s+menos/i.test(lower))) {
    pedido.items = [];
    pedido.total = 0;
    return "Listo, empezamos un nuevo pedido. ¿Qué te gustaría pedir?";
  }
  
     
  // Detectar frases como "borra", "elimina", "saca" o "quita" seguidas de un producto
  const borrarMatch = lower.match(/\b(?:borra(?:r|me|le)?|elimina(?:r|me|le)?|quita(?:r|me|le)?|saca(?:r|me|le)?|remueve|remove)\s+(.+)/i);
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
  const agregarMatch = lower.match(/\b(?:agrega(?:r|me|le)?|sumale?|añade|anade|pon(?:e|me|le)?|adiciona)\s+(\d+)?\s*(.+)/i);
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
  if (frasesSolicitarPago.some(f => lower.includes(f))) {
  yaSeRespondio = true;
  const link = await generarLinkPago(pedido); // o `generarLinkDePago(pedido, sender, sock)` si usás el socket
  pedido.pagado = true;
  return `¡Perfecto! Entonces lo dejamos así. Te paso el link de pago:\n${link}\nCuando completes el pago avisame y lo confirmo 😉`;
}
const matchEliminarParcial = lower.match(/(?:sacá|saca|restale|quitá|quita|quitale|eliminá|elimina|dejame|dejá solo|dejá|deja solamente|dejame solamente|dejame solo|dejá solamente|deja solamente|dejame solamente|dejáme solamente|saca todo a excepcion de)\s+(\d+)\s+(.*)/i);
if (matchEliminarParcial) {
  const cantidad = parseInt(matchEliminarParcial[1]);
  const nombreProducto = matchEliminarParcial[2];
  const productoEncontrado = encontrarProductoSimilar(nombreProducto, pedido.items.map(i => i.producto));

  if (productoEncontrado) {
    const item = pedido.items.find(i => i.producto === productoEncontrado);
    if (item) {
      item.cantidad -= cantidad;
      if (item.cantidad <= 0) {
        pedido.items = pedido.items.filter(i => i.producto !== productoEncontrado);
      } else {
        item.subtotal = item.cantidad * item.precio_unitario;
      }
      pedido.total = pedido.items.reduce((sum, i) => sum + i.subtotal, 0);
      yaSeRespondio = true;
      return mostrarPedido(pedido);
    }
  }
}

const matchRestar = lower.match(/(restale|sacá|quitá|quitale|dejame|dejá solo|dejá solamente|deja solamente|dejame solamente|dejáme solamente|saca todo a excepcion de)\s+(\d+)\s+(.*)/);
if (matchRestar) {
  const cantidad = parseInt(matchRestar[2]);
  const nombreProducto = matchRestar[3];
  const productoEncontrado = encontrarProductoSimilar(nombreProducto, pedido.items.map(i => i.producto));

  if (productoEncontrado) {
    const item = pedido.items.find(i => i.producto === productoEncontrado);
    if (item) {
      item.cantidad -= cantidad;
      if (item.cantidad <= 0) {
        pedido.items = pedido.items.filter(i => i.producto !== productoEncontrado);
      } else {
        item.subtotal = item.cantidad * item.precio_unitario;
      }
      pedido.total = pedido.items.reduce((sum, i) => sum + i.subtotal, 0);
      yaSeRespondio = true;
      return mostrarPedido(pedido);
    }
  }
}
// 👇 Detección múltiple de eliminación: “sacá nuggets y papas”, “restale 2 americanas y 1 onion”
const eliminacionesMultiples = parseEliminarMultiple(lower);
if (eliminacionesMultiples && eliminacionesMultiples.length > 0) {
  const huboCambios = aplicarEliminacionesMultiples(pedido, eliminacionesMultiples);
  if (huboCambios) {
    yaSeRespondio = true;
    return mostrarPedido(pedido); // o tu bloque que arma el resumen
  }
}
// 👇 Detección: “dejame solo 2 latas”, “dejá solamente tres nuggets”
const mantenerSolo = parseEliminarTodoExcepto(lower);
if (mantenerSolo) {
  const match = encontrarProductoSimilar(mantenerSolo.nombre)
             ?? Object.keys(menu).find(p => p.toLowerCase().includes(mantenerSolo.nombre.toLowerCase()));

  if (match) {
    const nombreCapitalizado = capitalize(match);
    const precio = menu[match];
    pedido.items = [{
      producto: nombreCapitalizado,
      cantidad: mantenerSolo.cantidad,
      precio_unitario: precio,
      subtotal: mantenerSolo.cantidad * precio
    }];
    pedido.total = mantenerSolo.cantidad * precio;

    yaSeRespondio = true;
    return mostrarPedido(pedido);
  }
}


  // Detectar intención con GPT-4o usando memoria
  const gptResult = await module.exports.procesarConGPT(pedido);
  // Detectar intención de pagar con GPT
if (gptResult.intencion_pagar === true) {
  yaSeRespondio = true;
  const link = await generarLinkPago(pedido);
  pedido.pagado = true;
  return `¡Perfecto! Entonces lo dejamos así. Te paso el link de pago:\n${link}\nCuando completes el pago avisame y lo confirmo 😉`;
}
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

if (gptResult.productos.length > 0) {
  gptResult.productos.forEach(p => {
    const nombreNormalizado = p.nombre.toLowerCase();
    const coincidencia = encontrarProductoSimilar(nombreNormalizado);
    if (!coincidencia) {
      console.log(`❌ No se reconoció el producto: "${p.nombre}"`);
      return;
    }

    const nombreCapitalizado = capitalize(coincidencia);
    const precioUnitario = menu[coincidencia];

    if (p.cantidad > 0) {
      // ✅ Agregar productos
      const subtotal = p.cantidad * precioUnitario;
      const existente = pedido.items.find(i => i.producto === nombreCapitalizado);
      if (existente) {
        existente.cantidad += p.cantidad;
        existente.subtotal += subtotal;
      } else {
        pedido.items.push({
          producto: nombreCapitalizado,
          cantidad: p.cantidad,
          precio_unitario: precioUnitario,
          subtotal
        });
      }
      pedido.total += subtotal;
    } else if (p.cantidad < 0) {
      // 🔻 Eliminar productos (cantidad negativa)
      const existente = pedido.items.find(i => i.producto === nombreCapitalizado);
      if (existente) {
        const quitar = Math.min(Math.abs(p.cantidad), existente.cantidad);
        existente.cantidad -= quitar;
        const resta = quitar * existente.precio_unitario;
        existente.subtotal -= resta;
        pedido.total -= resta;
        if (existente.cantidad <= 0) {
          pedido.items = pedido.items.filter(i => i.producto !== nombreCapitalizado);
        }
      }
    }
  });
let resumen = "Perfecto 👌 Tu pedido hasta ahora:\n";
  pedido.items.forEach(i => {
    resumen += `✅ ${i.cantidad} x ${i.producto} - $${i.subtotal}\n`;
  });
  resumen += `\n💵 Total: $${pedido.total}\n`;
  resumen += "¿Querés agregar algo más o generar el link de pago?";

  return resumen; // 👈 muy importante: devuelve el mensaje al usuario
}



  }
function resumenBreve(pedido) {
  if (!pedido || !pedido.items || pedido.items.length === 0) {
    return "Pedido vacío.";
  }
  const ult = pedido.items[pedido.items.length - 1];
  const resumen = `Último producto: ${ult.cantidad} ${ult.producto}.`;
  return resumen.slice(0, 120);
}

  let procesarConGPT = async function(pedido) {
  const historialGPT = [
  { role: "system", content: `
Sos un asistente inteligente de Camdis, una hamburguesería.

Tu función es ayudar al cliente a armar su pedido, responder dudas, y guiarlo hacia el pago. Usá lenguaje simpático e informal.

Interpretá frases de forma flexible, aunque sean poco claras o contengan errores.

📦 Tu salida debe ser **siempre un JSON válido**. Sin comentarios, sin explicaciones, solo el JSON.

🎯 OBJETIVOS:
- Detectar productos y cantidades mencionados (asumí 1 si no hay número).
- Identificar si el cliente pregunta por el precio de algo.
- Detectar si quiere cerrar el pedido o generar el link de pago.
- Detectar si quiere ver el menú.
- Detectar si quiere eliminar productos (con o sin cantidad).
- Soportar frases múltiples (ej. "sacá nuggets y poneme 2 bacon").

🧠 ENTENDÉ TAMBIÉN:
- Frases indirectas: “ya está bien así”, “dejame solo uno”, “me parece mucho”, “pasame el link”.
- Frases mezcladas: “sacá los nuggets y agregame 2 bacon cheese”.
🛑 IMPORTANTE: No repitas productos ya agregados en el historial. Solo procesá lo nuevo del mensaje.
⚙️ FORMATO DE RESPUESTA (siempre esto, sin texto extra):
{
  "productos": [{"nombre": "...", "cantidad": ...}],   // cantidad negativa si quiere eliminar
  "pregunta_precio": "...",                            // nombre del producto o null
  "cierre_pedido": true/false,
  "ofrecer_menu": true/false,
  "mostrar_menu": true/false,
  "intencion_pagar": true/false,
  "eliminar_productos": ["...", "..."]
}

📘 MENÚ ACTUAL:
  ${Object.keys(menu).map(p => capitalize(p)).join(", ")}
  ` }
  ,
  { role: "system", content: resumenBreve(pedido) },
    ...pedido.historial.slice(-1)
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

