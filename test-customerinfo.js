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
  intencion_pagar: false,
  eliminar_productos: []
});

bot.generarLinkPago = async () => 'http://fake.link';

async function run() {
  const pedido = {
    cliente: 'test',
    items: [{ producto: 'Cheeseburger Simple', cantidad: 1, precio_unitario: 8000, subtotal: 8000 }],
    total: 8000,
    historial: [],
    interacciones: 0,
    pagado: false
  };

  let resp = await bot.manejarMensaje('pasame el link', pedido);
  assert(/nombre/i.test(resp));
  resp = await bot.manejarMensaje('mariano balbuena, efectivo, uttinger 154', pedido);
  assert(/Mariano Balbuena/i.test(resp));
  assert(/uttinger 154/i.test(resp));
  assert(/efectivo/i.test(resp));
  assert.strictEqual(pedido.medioPago, 'efectivo');
  assert.strictEqual(pedido.pagado, true);

  const pedido2 = {
    cliente: 'test2',
    items: [{ producto: 'Cheeseburger Simple', cantidad: 1, precio_unitario: 8000, subtotal: 8000 }],
    total: 8000,
    historial: [],
    interacciones: 0,
    pagado: false
  };

  resp = await bot.manejarMensaje('pasame el link', pedido2);
  assert(/nombre/i.test(resp));
  resp = await bot.manejarMensaje('Me llamo Dante Balbuena', pedido2);
  assert(/direcci[óo]n/i.test(resp));
  resp = await bot.manejarMensaje('Centenario 49', pedido2);
  assert(/pago/i.test(resp));
  resp = await bot.manejarMensaje('Mercado Pago', pedido2);
  assert(/Dante Balbuena/i.test(resp));
  assert(/http:\/\/fake.link/.test(resp));
  assert.strictEqual(pedido2.medioPago, 'mercado pago');
  assert.strictEqual(pedido2.pagado, true);
  console.log('Customer info tests passed');
}

run();
