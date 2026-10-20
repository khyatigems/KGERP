const OFFLINE_PAGE = `<!doctype html>
<html lang="en">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#181547">
  <title>KhyatiGems ERP · Offline</title>
  <body style="font:16px system-ui,sans-serif;max-width:36rem;margin:15vh auto;padding:1.5rem;color:#181547">
    <h1>You are offline</h1>
    <p>Reconnect to the internet, then reload KhyatiGems ERP. Business data is not available offline.</p>
  </body>
</html>`;

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_PAGE, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })),
  );
});
