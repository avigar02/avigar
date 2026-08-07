/*
  Service worker de AVIGARS — solo se encarga de mostrar notificaciones push.
  No cachea nada de la página (no es necesario para esto).
*/

self.addEventListener('push', function(event){
  let data = {};
  try{
    data = event.data ? event.data.json() : {};
  }catch(e){
    data = { title: 'AVIGARS', body: event.data ? event.data.text() : 'Tienes una notificación nueva.' };
  }

  const title = data.title || 'AVIGARS';
  const options = {
    body: data.body || '',
    icon: data.icon || undefined,
    badge: data.badge || undefined,
    data: { url: data.url || '/avigars.html' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/avigars.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(windowClients){
      for (const client of windowClients){
        if (client.url.includes('avigars.html') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
