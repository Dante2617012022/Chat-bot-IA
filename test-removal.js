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

  // Caso 1: filtrar por Araka
  const pedido1 = {
    cliente: 'tester1',
    items: [
      { producto: 'Araka simple', cantidad: 1, precio_unitario: menu['Araka simple'], subtotal: menu['Araka simple'] },
      { producto: 'Bacon Cheese Doble', cantidad: 1, precio_unitario: menu['Bacon cheese doble'], subtotal: menu['Bacon cheese doble'] }
    ],
    total: menu['Araka simple'] + menu['Bacon cheese doble'],
    historial: [],
    interacciones: 0,
    pagado: false
  };

  await bot.manejarMensaje('eliminá todo menos las arakas', pedido1);
  assert.strictEqual(pedido1.items.length, 1);
  assert.strictEqual(pedido1.items[0].producto, 'Araka simple');
  console.log('Test passed: only Araka remains');

  // Caso 2: eliminar Onion
  const pedido2 = {
    cliente: 'tester2',
    items: [
      { producto: 'Onion simple', cantidad: 2, precio_unitario: menu['Onion simple'], subtotal: menu['Onion simple'] * 2 },
      { producto: 'Bacon Cheese Doble', cantidad: 1, precio_unitario: menu['Bacon cheese doble'], subtotal: menu['Bacon cheese doble'] }
    ],
    total: menu['Onion simple'] * 2 + menu['Bacon cheese doble'],
    historial: [],
    interacciones: 0,
    pagado: false
  };

  await bot.manejarMensaje('borra las onion', pedido2);
  assert.strictEqual(pedido2.items.length, 1);
  assert.strictEqual(pedido2.items[0].producto, 'Bacon Cheese Doble');
  console.log('Test passed: onions removed');

  // Caso 3: mantener solo Onion
  const pedido3 = {
    cliente: 'tester3',
    items: [
      { producto: 'Onion simple', cantidad: 1, precio_unitario: menu['Onion simple'], subtotal: menu['Onion simple'] },
      { producto: 'Papas clasicas', cantidad: 1, precio_unitario: menu['Papas clasicas'], subtotal: menu['Papas clasicas'] }
    ],
    total: menu['Onion simple'] + menu['Papas clasicas'],
    historial: [],
    interacciones: 0,
    pagado: false
  };

  await bot.manejarMensaje('todo menos las onion', pedido3);
  assert.strictEqual(pedido3.items.length, 1);
  assert.strictEqual(pedido3.items[0].producto, 'Onion simple');
  console.log('Test passed: Onion items kept');
}

run();

