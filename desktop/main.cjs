const { app, BrowserWindow, Menu, net, protocol, session, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SITE_ORIGIN = 'https://champions-lab-wenbei.buzzy-whale-7204.chatgpt.site';
const APP_ORIGIN = 'champions://app';
const ASSET_ROOT = path.resolve(__dirname, '../dist/desktop');
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
].join('; ');

protocol.registerSchemesAsPrivileged([
  { scheme: 'champions', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

let mainWindow;
let loginWindow;

async function cloudAPI(request, url) {
  if (!/^\/api\/teams(?:\/[a-zA-Z0-9-]{8,80})?$/.test(url.pathname)) {
    return Response.json({ error: '找不到该接口。' }, { status: 404 });
  }
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) {
    return Response.json({ error: '请求方法不支持。' }, { status: 405 });
  }

  const headers = new Headers();
  for (const name of ['content-type', 'if-match']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (request.method !== 'GET') headers.set('Origin', SITE_ORIGIN);
  const cookies = await session.defaultSession.cookies.get({ url: SITE_ORIGIN });
  if (cookies.length) headers.set('Cookie', cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; '));
  const body = request.method === 'GET' ? undefined : await request.arrayBuffer();
  if (body?.byteLength > 65536) return Response.json({ error: '队伍文件过大。' }, { status: 413 });

  try {
    const upstream = await session.defaultSession.fetch(SITE_ORIGIN + url.pathname + url.search, {
      method: request.method,
      headers,
      body,
      credentials: 'include',
      redirect: 'manual',
    });
    const contentType = upstream.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return Response.json({ error: '云端需要登录。请使用软件中的登录入口。', code: 'signin_required' }, { status: 401 });
    }
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch {
    return Response.json({ error: '暂时无法连接云端。你仍可使用本地队伍和导入／导出。', code: 'storage_unavailable' }, { status: 503 });
  }
}

async function bundledFile(request, url) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  let relativePath;
  try { relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'; }
  catch { return new Response('Bad request', { status: 400 }); }
  const filePath = path.resolve(ASSET_ROOT, relativePath);
  const relative = path.relative(ASSET_ROOT, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return new Response('Forbidden', { status: 403 });
  try {
    if (!(await fs.stat(filePath)).isFile()) return new Response('Not found', { status: 404 });
    const response = await net.fetch(pathToFileURL(filePath).toString());
    if (relativePath !== 'index.html') return response;
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

function openCloudSignIn() {
  if (loginWindow && !loginWindow.isDestroyed()) return loginWindow.focus();
  loginWindow = new BrowserWindow({
    parent: mainWindow,
    width: 730,
    height: 820,
    minWidth: 540,
    minHeight: 600,
    title: '登录云端队伍 · 冠军实验室',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
  });
  loginWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('https://')) return { action: 'deny' };
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
      },
    };
  });
  loginWindow.webContents.on('will-navigate', (event, target) => {
    if (!target.startsWith('https://')) event.preventDefault();
  });
  const finishSignIn = (_event, target) => {
    try {
      const destination = new URL(target);
      if (destination.origin === SITE_ORIGIN && destination.pathname === '/' && destination.hash === '#teams') {
        if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
      }
    } catch { /* Keep the login window open for the user. */ }
  };
  loginWindow.webContents.on('did-navigate', finishSignIn);
  loginWindow.webContents.on('did-navigate-in-page', finishSignIn);
  loginWindow.on('closed', () => {
    loginWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.reload();
  });
  loginWindow.loadURL(SITE_ORIGIN + '/signin-with-chatgpt?return_to=%2F%23teams');
}

async function smokeTest(window) {
  try {
    const result = await window.webContents.executeJavaScript(`(async () => {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const image = document.querySelector('.pokemon-art');
      const damageResults = document.querySelectorAll('.damage-result').length;
      const imageLoaded = !!image && image.complete && image.naturalWidth > 0;
      const saved = localStorage.getItem('__desktop_smoke');
      localStorage.setItem('__desktop_smoke', 'ok');
      const storageWorks = localStorage.getItem('__desktop_smoke') === 'ok';
      if (saved === null) localStorage.removeItem('__desktop_smoke');
      else localStorage.setItem('__desktop_smoke', saved);
      document.querySelector('a[href="#speed"]').click();
      await new Promise(resolve => setTimeout(resolve, 80));
      const speedWorks = document.title.startsWith('速度线') && !!document.querySelector('.speed-page');
      const teamKey = 'champions-lab.teams.v1';
      const previousTeams = localStorage.getItem(teamKey);
      let localTeamWorks = false;
      try {
        document.querySelector('a[href="#teams"]').click();
        await new Promise(resolve => setTimeout(resolve, 80));
        document.querySelector('button[aria-label="配置第1位"]').click();
        await new Promise(resolve => setTimeout(resolve, 80));
        [...document.querySelectorAll('button')].find(button => button.textContent.includes('保存到本地')).click();
        await new Promise(resolve => setTimeout(resolve, 80));
        const savedTeams = localStorage.getItem(teamKey);
        localTeamWorks = !!savedTeams && savedTeams !== previousTeams && !!document.querySelector('.team-message.success');
      } finally {
        if (previousTeams === null) localStorage.removeItem(teamKey);
        else localStorage.setItem(teamKey, previousTeams);
      }
      const api = await fetch('/api/teams').then(response => response.status).catch(() => 0);
      return { title: document.title, damageResults,
        imageLoaded, storageWorks, speedWorks, localTeamWorks, api };
    })()`);
    console.log('DESKTOP_SMOKE ' + JSON.stringify(result));
    app.exit(result.damageResults >= 2 && result.imageLoaded && result.storageWorks && result.speedWorks && result.localTeamWorks && [200, 401].includes(result.api) ? 0 : 1);
  } catch (error) {
    console.error('DESKTOP_SMOKE_ERROR ' + error.message);
    app.exit(1);
  }
}

function createWindow() {
  const smoke = process.argv.includes('--desktop-smoke');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 900,
    minHeight: 620,
    show: !smoke,
    title: '冠军实验室',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#f3f5fa',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, target) => {
    try {
      const destination = new URL(target);
      const isApp = destination.protocol === 'champions:' && destination.hostname === 'app';
      if (isApp && destination.pathname === '/signin-with-chatgpt') {
        event.preventDefault();
        openCloudSignIn();
      } else if (!isApp || destination.pathname !== '/') {
        event.preventDefault();
        if (destination.protocol === 'https:') shell.openExternal(target);
      }
    } catch { event.preventDefault(); }
  });
  if (smoke) mainWindow.webContents.once('did-finish-load', () => smokeTest(mainWindow));
  mainWindow.loadURL(APP_ORIGIN + '/');
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.beibei.championslab');
  protocol.handle('champions', request => {
    const url = new URL(request.url);
    if (url.hostname !== 'app') return new Response('Not found', { status: 404 });
    if (url.pathname.startsWith('/api/')) return cloudAPI(request, url);
    return bundledFile(request, url);
  });
  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ defaultPath: path.join(app.getPath('downloads'), item.getFilename()) });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: '文件', submenu: [
      { label: '登录云端队伍', click: openCloudSignIn },
      { label: '刷新', accelerator: 'Ctrl+R', click: () => mainWindow?.webContents.reload() },
      { type: 'separator' },
      { role: 'quit', label: '退出' },
    ] },
    { label: '视图', submenu: [
      { role: 'zoomIn', label: '放大' },
      { role: 'zoomOut', label: '缩小' },
      { role: 'resetZoom', label: '恢复缩放' },
    ] },
  ]));
  createWindow();
});

app.on('window-all-closed', () => app.quit());
