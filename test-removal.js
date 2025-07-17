const assert = require('assert');
process.env.OPENAI_API_KEY = 'test';
process.env.MERCADO_PAGO_ACCESS_TOKEN = 'test';
const bot = require('./index');

// Mock GPT response to remove Bacon cheese doble
bot.procesarConGPT = async () => ({
  productos: [],
  pregunta_precio: null,
  cierre_pedido: false,
  ofrecer_menu: false,
  mostrar_menu: false,
  eliminar_productos: [{ nombre: 'bacon cheese doble' }]
});

const menu = bot.menu;

async function run() {
  const pedido = {
    cliente: 'tester',
    items: [
      { producto: 'Araka simple', cantidad: 1, precio_unitario: menu['Araka simple'], subtotal: menu['Araka simple'] },
      { producto: 'Bacon Cheese Doble', cantidad: 1, precio_unitario: menu['Bacon cheese doble'], subtotal: menu['Bacon cheese doble'] }
    ],
    total: menu['Araka simple'] + menu['Bacon cheese doble'],
    historial: [],
    interacciones: 0,
    pagado: false
  };

  await bot.manejarMensaje('eliminá todo menos las arakas', pedido);

  assert.strictEqual(pedido.items.length, 1);
  assert.strictEqual(pedido.items[0].producto, 'Araka simple');
  console.log('Test passed: only Araka remains');
}

run();
