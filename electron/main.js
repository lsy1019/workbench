const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// 简易静态服务（Electron 内直接 serve dist 目录）
function startServer(distDir, port) {
  const http = require('http');
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(distDir, urlPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      // SPA fallback
      const indexPath = path.join(distDir, 'index.html');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(indexPath).pipe(res);
    }
  });

  server.listen(port, '127.0.0.1');
  return server;
}

let mainWindow;
let server;

function createWindow() {
  const distDir = path.join(__dirname, '..', 'dist');
  const port = 8080;
  server = startServer(distDir, port);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "L_ML的工作台",
    icon: path.join(distDir, 'icons', 'icon-512x512.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#FFF5F6',
    titleBarStyle: 'hiddenInset',
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hiddenInset' } : {}),
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  // 在外部浏览器打开链接
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
