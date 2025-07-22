const assert = require('assert');
process.env.OPENAI_API_KEY = 'test';
process.env.MERCADO_PAGO_ACCESS_TOKEN = 'test';
const bot = require('./index');

// Mock GPT
bot.procesarConGPT = async () => ({
  productos: [],
  pregunta_precio: null,
  cierre_pedido: false,
  ofrecer_menu: false,
  mostrar_menu: false,
  eliminar_productos: []
});

const menu = bot.menu;

async function run() {
  const pedido = {
    cliente: 'tester',
    items: [],
    total: 0,
    historial: [],
    interacciones: 0,
    pagado: false
  };

  await bot.manejarMensaje('agregale 2 cuarto a triples', pedido);
  assert.strictEqual(pedido.items.length, 1);
  assert.strictEqual(pedido.items[0].producto, 'Cuarto A Triple');
  assert.strictEqual(pedido.items[0].cantidad, 2);
  assert.strictEqual(pedido.total, menu['Cuarto A triple'] * 2);

  await bot.manejarMensaje('quitale 1 cuarto a triple', pedido);
  assert.strictEqual(pedido.items[0].cantidad, 1);
  assert.strictEqual(pedido.total, menu['Cuarto A triple']);

  await bot.manejarMensaje('agrega 1 onion simple', pedido);
  assert.strictEqual(pedido.items.length, 2);
  assert.strictEqual(pedido.items[1].producto, 'Onion Simple');

  await bot.manejarMensaje('borra las onion', pedido);
  assert.strictEqual(pedido.items.length, 1);
  assert.strictEqual(pedido.items[0].producto, 'Cuarto A Triple');
  console.log('Add/remove sequence tests passed');
}

run();
