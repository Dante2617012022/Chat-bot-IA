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
    cliente: 'fallback',
    items: [],
    total: 0,
    historial: [],
    interacciones: 0,
    pagado: false
  };

  const resp = await bot.manejarMensaje('saludo generico', pedido);
  assert.strictEqual(resp, undefined);
  assert.strictEqual(pedido.items.length, 0);
  assert.strictEqual(pedido.total, 0);
  console.log('Fallback branch test passed');
}

run();
