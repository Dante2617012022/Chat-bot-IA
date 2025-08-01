const assert = require('assert');
process.env.OPENAI_API_KEY = 'test';
process.env.MERCADO_PAGO_ACCESS_TOKEN = 'test';
const bot = require('./index');

bot.procesarConGPT = async () => ({
  productos: [],
  pregunta_precio: null,
  cierre_pedido: false,
  ofrecer_menu: false,
  mostrar_menu: false,
  eliminar_productos: []
});

async function run() {
  const pedido = {
    cliente: 'numberwords',
    items: [],
    total: 0,
    historial: [],
    interacciones: 0,
    pagado: false
  };

  await bot.manejarMensaje('agrega siete bacon cheese triple', pedido);
  assert.strictEqual(pedido.items.length, 1);
  assert.strictEqual(pedido.items[0].producto, 'Bacon Cheese Triple');
  assert.strictEqual(pedido.items[0].cantidad, 7);
  console.log('Number words test passed');
}

run();
