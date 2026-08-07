# AVIGARS - Importar productos desde KakoBuy

Hay dos formas de traer datos de un producto de KakoBuy a tu panel
Admin. **La opción 1 (bookmarklet) es la que de verdad funciona**,
porque lee la página tal como tú la ves en tu navegador, ya cargada.
La opción 2 (auto-rellenar por link) es un respaldo que muchas veces
no encuentra nada, porque KakoBuy carga sus datos con JavaScript
después de abrir la página, y ese método solo ve el HTML inicial.

---

## Opción 1: Bookmarklet "Importar a AVIGARS" (recomendada)

Un bookmarklet es un botón que guardas en tu barra de marcadores. En
vez de ir a una página, ejecuta un pequeño script sobre la página que
tienes abierta. Lo usas así: entras a KakoBuy, abres el producto que
quieres, esperas a que cargue normal (fotos y precio visibles), y le
das clic al bookmarklet. Automáticamente se abre tu panel Admin con
el nombre, las fotos y el precio ya listos para revisar.

### Paso 1: Arranca el servidor local

```
cd backend
npm install
npm start
```

Debe decir `AVIGARS scraper backend escuchando en el puerto 3001`.
Déjalo corriendo mientras uses el bookmarklet.

### Paso 2: Abre AVIGARS desde esta URL (importante)

Ya no abras `avigars.html` con doble clic. Ábrelo así, con el
servidor corriendo:

```
http://localhost:3001/avigars.html
```

(Esto es necesario para que el bookmarklet pueda abrir la página sin
que el navegador lo bloquee — los navegadores no dejan que una página
web abra un archivo local `file://` directamente).

### Paso 3: Crea el bookmarklet

1. Muestra tu barra de marcadores (Chrome: `Ctrl+Shift+B`).
2. Click derecho en la barra → "Agregar página" (o "Añadir marcador").
3. En **Nombre**, pon: `Importar a AVIGARS`
4. En **URL**, pega exactamente esto (todo junto, es una sola línea):

```
javascript:(function(){var t=(document.querySelector('meta[property="og:title"]')||{}).content||document.title||'';var imgs=new Set();document.querySelectorAll('meta[property="og:image"]').forEach(function(m){if(m.content)imgs.add(m.content)});document.querySelectorAll('img').forEach(function(img){if(img.src&&img.src.indexOf('http')===0&&img.naturalWidth>150&&!/logo|icon|sprite|avatar/i.test(img.src))imgs.add(img.src)});var body=document.body.innerText||'';var pm=body.match(/[¥￥]\s?\d+(\.\d+)?/)||body.match(/\$\s?\d+(\.\d+)?/);var data={title:t.trim(),images:Array.from(imgs).slice(0,15),price:pm?pm[0]:null,sourceUrl:location.href};var url='http://localhost:3001/avigars.html?import='+encodeURIComponent(JSON.stringify(data));window.open(url,'_blank');})();
```

5. Guarda el marcador.

### Paso 4: Úsalo

1. Ve a KakoBuy, abre el producto que quieres, espera a que cargue
   completo (fotos y precio visibles en pantalla).
2. Haz clic en el bookmarklet "Importar a AVIGARS" en tu barra de
   marcadores.
3. Se abre una pestaña nueva con AVIGARS. Si ya tenías sesión de
   Admin iniciada, el panel se abre solo con los datos llenos. Si no,
   inicia sesión (`admin@avigars.com` / `admin1234`) y se completa
   automático.
4. Revisa el nombre, elige la foto principal entre las que trajo
   (clic en una miniatura), ajusta el precio si hace falta, y dale
   "Agregar al catálogo".

### Si trae pocas o ninguna foto/precio

Algunas páginas cargan las fotos poco a poco al hacer scroll. Antes
de usar el bookmarklet, baja con el scroll por toda la página del
producto una vez (para que el navegador cargue todas las imágenes) y
luego usa el bookmarklet. El nombre y precio casi siempre se detectan
bien; las fotos dependen de cómo esté armada esa página en particular
— siempre puedes completar a mano las que falten.

---

## Opción 2: Auto-rellenar por link (respaldo, menos confiable)

Con el mismo servidor corriendo, en el panel Admin puedes pegar el
link y darle "Auto-rellenar desde link". Esto pide al servidor que
visite la página por su cuenta — pero como explicamos arriba, si
KakoBuy carga los datos con JavaScript, este método no ve nada más
que el HTML inicial (a veces ni el nombre correcto). Úsalo solo si el
bookmarklet no es una opción por alguna razón.

---

## Publicar el servidor para que no dependa de tu compu

Si más adelante quieres que esto funcione sin tener la terminal
abierta en tu computadora, tienes que subir la carpeta `backend` a un
servicio como [Render.com](https://render.com) (plan gratis):

1. Sube `backend` a un repositorio de GitHub.
2. En Render: "New +" → "Web Service" → selecciona el repo.
3. Build command: `npm install` — Start command: `npm start`.
4. Te da una URL pública, ej. `https://avigars-backend.onrender.com`.
5. Cambia todas las referencias a `http://localhost:3001` (en el
   bookmarklet y en `avigars.html`, constante `SCRAPER_API`) por esa
   URL.
