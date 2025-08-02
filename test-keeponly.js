const assert = require('assert');
process.env.OPENAI_API_KEY = 'test';
process.env.MERCADO_PAGO_ACCESS_TOKEN = 'test';
const bot = require('./index');

// Mock GPT to avoid network
bot.procesarConGPT = async () => ({
  productos: [],
  pregunta_precio: null,
  cierre_pedido: false,
  ofrecer_menu: false,
  mostrar_menu: false,
  eliminar_productos: [],
  intencion_pagar: false
});

const menu = bot.menu;

async function run() {
  const pedido = {
    cliente: 'tester',
    items: [
      { producto: 'Nuggets x6', cantidad: 1, precio_unitario: menu['Nuggets x6'], subtotal: menu['Nuggets x6'] },
      { producto: 'Lata', cantidad: 4, precio_unitario: menu['Lata'], subtotal: menu['Lata'] * 4 }
    ],
    total: menu['Nuggets x6'] + menu['Lata'] * 4,
    historial: [],
    interacciones: 0,
    pagado: false
  };

  await bot.manejarMensaje('dejame solo 3 latas', pedido);
  assert.strictEqual(pedido.items.length, 1);
  assert.strictEqual(pedido.items[0].producto, 'Lata');
  assert.strictEqual(pedido.items[0].cantidad, 3);
  assert.strictEqual(pedido.total, menu['Lata'] * 3);
  console.log('Leave-only command test passed');
}

run();
