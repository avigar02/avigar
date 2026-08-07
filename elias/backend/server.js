/*
  ====================================================================
  AVIGARS - Backend local (auto-rellenado + bookmarklet de importación)
  ====================================================================
  Este servidor hace dos cosas:

  1) Sirve avigars.html por http://localhost:3001/avigars.html en vez
     de abrirlo como archivo (file://). Esto es necesario para que el
     "bookmarklet" de importación (ver README.md) pueda abrir la
     página desde KakoBuy sin que el navegador lo bloquee por
     seguridad (los navegadores modernos bloquean que una página web
     abra archivos file:// directamente).

  2) /scrape?url=... intenta leer una página de KakoBuy desde el
     servidor y sacar título/imágenes/precio. LIMITACIÓN: si KakoBuy
     carga esos datos con JavaScript (muy común), esto no ve nada,
     porque solo lee el HTML inicial. Por eso el bookmarklet (opción 1
     del README) es la forma recomendada y confiable; este endpoint
     queda como alternativa de respaldo.

  CÓMO USARLO:
  1) Instala Node.js (https://nodejs.org) si no lo tienes.
  2) Abre una terminal en esta carpeta "backend" y corre:
       npm install
       npm start
  3) Abre tu navegador en: http://localhost:3001/avigars.html
     (ya NO abras el archivo con doble clic mientras uses esto,
     para que el bookmarklet funcione bien).
  ====================================================================
*/

const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const webpush = require('web-push');

const app = express();
app.use(cors());
app.use(express.json());

const SITE_ROOT = path.join(__dirname, '..');
app.get('/avigars.html', (req, res) => res.sendFile(path.join(SITE_ROOT, 'avigars.html')));
app.get('/sw.js', (req, res) => res.sendFile(path.join(SITE_ROOT, 'sw.js')));
app.get('/', (req, res) => res.redirect('/avigars.html'));

/*
  ====================================================================
  Notificaciones push reales para el admin
  ====================================================================
  Las llaves VAPID de abajo ya están generadas y listas para usar en tu
  computadora / pruebas locales. Identifican a TU servidor ante los
  navegadores (Chrome, Firefox, etc.) para poder mandar notificaciones.
  No son secretas en el sentido de una contraseña, pero si publicas
  este proyecto de verdad, es buena práctica generar tus propias llaves
  con:  npx web-push generate-vapid-keys
  y reemplazar las de aquí abajo.
*/
const VAPID_PUBLIC_KEY = 'BD7aeEFZQBYdiD9glcC-dT3kE5vMexO8iCeVVYnzYGmNdNxwKTanBkjKoRdDzEZ282BNKYl9hQSo5o8Tnp0vMRo';
const VAPID_PRIVATE_KEY = '2-oGkuEEc-6ERq401gsz3OrUkVf_Hn4Gz1b-mJFtqBY';
webpush.setVapidDetails('mailto:admin@avigars.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

/*
  Guardamos tickets y suscripciones push en un archivo JSON en esta misma
  carpeta (data.json), así sobreviven a que reinicies el servidor y
  cualquier dispositivo que abra la página ve los mismos tickets.
*/
const DATA_FILE = path.join(__dirname, 'data.json');
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return { tickets: [], subscriptions: [] };
  }
}
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}
let appData = loadData();

app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// El admin llama esto una vez (desde el botón "Activar notificaciones")
// para registrar su dispositivo/navegador y poder recibir avisos.
app.post('/api/subscribe', (req, res) => {
  const sub = req.body;
  if (!sub || !sub.endpoint) {
    return res.status(400).json({ error: 'Suscripción inválida.' });
  }
  if (!appData.subscriptions.find(s => s.endpoint === sub.endpoint)) {
    appData.subscriptions.push(sub);
    saveData(appData);
  }
  res.json({ ok: true });
});

app.get('/api/tickets', (req, res) => {
  res.json(appData.tickets);
});

// Se llama cuando alguien usa "Contactar con una persona real" en el chat.
// Guarda el ticket y manda una notificación push a todos los dispositivos
// de admin que se hayan suscrito.
app.post('/api/tickets', async (req, res) => {
  const { message, userEmail, userName } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Falta el mensaje.' });
  }

  const ticket = {
    id: 'TCK-' + Date.now().toString().slice(-8),
    userEmail: userEmail || 'invitado',
    userName: userName || 'Invitado (sin sesión)',
    message: message.trim(),
    date: new Date().toISOString(),
    resolved: false,
    // El primer mensaje del cliente también queda como el primer mensaje
    // del chat, así el admin ve la queja original al abrir la conversación.
    messages: [
      { id: 'MSG-' + Date.now().toString().slice(-9), sender: 'user', text: message.trim(), date: new Date().toISOString() }
    ]
  };
  appData.tickets.push(ticket);
  saveData(appData);

  const payload = JSON.stringify({
    title: 'AVIGARS: alguien pidió hablar con una persona',
    body: `${ticket.userName}: ${ticket.message.slice(0, 120)}`,
    url: '/avigars.html'
  });

  const results = await Promise.allSettled(
    appData.subscriptions.map(sub => webpush.sendNotification(sub, payload))
  );

  // Si una suscripción ya no es válida (el usuario desinstaló / revocó permisos),
  // el servicio de push responde 404/410. La quitamos para no seguir intentando.
  const deadEndpoints = [];
  results.forEach((r, i) => {
    if (r.status === 'rejected' && r.reason && (r.reason.statusCode === 404 || r.reason.statusCode === 410)) {
      deadEndpoints.push(appData.subscriptions[i].endpoint);
    }
  });
  if (deadEndpoints.length) {
    appData.subscriptions = appData.subscriptions.filter(s => !deadEndpoints.includes(s.endpoint));
    saveData(appData);
  }

  res.json(ticket);
});

app.patch('/api/tickets/:id/resolve', (req, res) => {
  const t = appData.tickets.find(x => x.id === req.params.id);
  if (t) {
    t.resolved = true;
    saveData(appData);
  }
  res.json({ ok: true });
});

/*
  ====================================================================
  Chat en vivo (admin <-> cliente) por ticket, usando Server-Sent Events
  ====================================================================
  Cada ticket tiene su propia "conversación" (t.messages). Cuando alguien
  manda un mensaje nuevo (POST), se lo mandamos de inmediato a todos los
  que estén viendo ese ticket en ese momento (el admin y/o el cliente),
  usando una conexión abierta (SSE) — así llega sin recargar la página.
*/
const sseClientsByTicket = {}; // ticketId -> Set de respuestas HTTP abiertas

function broadcastToTicket(ticketId, msg) {
  const subs = sseClientsByTicket[ticketId];
  if (!subs) return;
  const payload = `data: ${JSON.stringify(msg)}\n\n`;
  subs.forEach(res => {
    try { res.write(payload); } catch (e) { /* conexión ya cerrada, se limpia sola */ }
  });
}

app.get('/api/tickets/:id/messages', (req, res) => {
  const t = appData.tickets.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket no encontrado.' });
  res.json(t.messages || []);
});

app.post('/api/tickets/:id/messages', (req, res) => {
  const t = appData.tickets.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Ticket no encontrado.' });

  const { sender, text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Falta el mensaje.' });
  if (sender !== 'admin' && sender !== 'user') return res.status(400).json({ error: 'sender debe ser "admin" o "user".' });

  const msg = {
    id: 'MSG-' + Date.now().toString().slice(-9) + Math.floor(Math.random() * 1000),
    sender,
    text: text.trim(),
    date: new Date().toISOString()
  };
  if (!t.messages) t.messages = [];
  t.messages.push(msg);
  saveData(appData);

  broadcastToTicket(req.params.id, msg);
  res.json(msg);
});

// El navegador abre esta conexión y la deja abierta; el servidor le va
// "escribiendo" cada mensaje nuevo de ese ticket en cuanto llega.
app.get('/api/tickets/:id/stream', (req, res) => {
  const ticketId = req.params.id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write('\n');

  if (!sseClientsByTicket[ticketId]) sseClientsByTicket[ticketId] = new Set();
  sseClientsByTicket[ticketId].add(res);

  req.on('close', () => {
    if (sseClientsByTicket[ticketId]) sseClientsByTicket[ticketId].delete(res);
  });
});

app.get('/scrape', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Falta el parámetro url, ej: /scrape?url=https://kakobuy.com/...' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8'
      }
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'El sitio respondió con error (' + response.status + '). Puede que esté bloqueando lectura automática.' });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let title =
      $('meta[property="og:title"]').attr('content') ||
      $('title').text() ||
      '';
    title = title.trim();

    let images = [];
    $('meta[property="og:image"]').each((_, el) => {
      const c = $(el).attr('content');
      if (c) images.push(c);
    });
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original');
      if (src && src.startsWith('http')) images.push(src);
    });
    images = [...new Set(images)]
      .filter(src => !/logo|icon|sprite|avatar|placeholder/i.test(src))
      .slice(0, 15);

    let price = null;
    const priceMatch = html.match(/[¥￥]\s?\d+(\.\d+)?/) || html.match(/\$\s?\d+(\.\d+)?/);
    if (priceMatch) price = priceMatch[0];

    const foundSomething = title || images.length || price;

    res.json({
      title,
      images,
      price,
      sourceUrl: targetUrl,
      warning: foundSomething ? null : 'No se encontró información. Es probable que esta página cargue sus datos con JavaScript y este método simple no pueda leerlos. Tendrás que llenar los datos a mano esta vez.'
    });
  } catch (err) {
    res.status(500).json({
      error: 'No se pudo leer esa página automáticamente.',
      detail: err.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('AVIGARS scraper backend escuchando en el puerto ' + PORT));
