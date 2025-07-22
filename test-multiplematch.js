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

const menu = bot.menu;

async function run() {
  const pedido = {
    cliente: 'multi',
    items: [
      { producto: 'Araka simple', cantidad: 1, precio_unitario: menu['Araka simple'], subtotal: menu['Araka simple'] },
      { producto: 'Araka doble', cantidad: 1, precio_unitario: menu['Araka doble'], subtotal: menu['Araka doble'] }
    ],
    total: menu['Araka simple'] + menu['Araka doble'],
    historial: [],
    interacciones: 0,
    pagado: false
  };

  const resp = await bot.manejarMensaje('borra araka', pedido);
  assert(resp.includes('¿Cuál querés eliminar'), 'should ask which one to remove');
  console.log('Multi-match removal test passed');
}

run();
