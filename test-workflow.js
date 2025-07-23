const assert = require('assert');
process.env.OPENAI_API_KEY = 'test';
process.env.MERCADO_PAGO_ACCESS_TOKEN = 'test';
const bot = require('./index');

// Mock GPT with no special actions
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
    cliente: 'workflow',
    items: [],
    total: 0,
    historial: [],
    interacciones: 0,
    pagado: false
  };

  await bot.manejarMensaje('agrega 3 cheeseburger simple', pedido);
  assert.strictEqual(pedido.items.length, 1);
  assert.strictEqual(pedido.items[0].producto, 'Cheeseburger Simple');
  assert.strictEqual(pedido.items[0].cantidad, 3);
  assert.strictEqual(pedido.total, menu['Cheeseburger simple'] * 3);

  await bot.manejarMensaje('borra 2 cheeseburger simple', pedido);
  assert.strictEqual(pedido.items[0].cantidad, 1);
  assert.strictEqual(pedido.total, menu['Cheeseburger simple']);

  await bot.manejarMensaje('agrega 2 onion doble', pedido);
  assert.strictEqual(pedido.items.length, 2);
  assert.strictEqual(pedido.items[1].producto, 'Onion Doble');
  let expected = menu['Cheeseburger simple'] + menu['Onion doble'] * 2;
  assert.strictEqual(pedido.total, expected);

  await bot.manejarMensaje('borra todo', pedido);
  assert.strictEqual(pedido.items.length, 0);
  assert.strictEqual(pedido.total, 0);

await bot.manejarMensaje('agrega 1 onion simple', pedido);
  assert.strictEqual(pedido.items.length, 1);
  let resp = await bot.manejarMensaje('nuevo pedido', pedido);
  assert.strictEqual(pedido.items.length, 0);
  assert.strictEqual(pedido.total, 0);
  assert(/nuevo pedido|reinici/.test(resp.toLowerCase()));

  await bot.manejarMensaje('agrega 1 bacon cheese doble', pedido);
  resp = await bot.manejarMensaje('cancelar todo', pedido);
  assert.strictEqual(pedido.items.length, 0);
  assert.strictEqual(pedido.total, 0);
  assert(/nuevo pedido|reinici/.test(resp.toLowerCase()));
  console.log('Workflow tests passed');
}

run();
