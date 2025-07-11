const { app, BrowserWindow } = require('electron')
const path = require('path')

async function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      contextIsolation: true
    }
  })

  if (process.env.NODE_ENV === 'development') {
    // En dev, carga la PWA de Vite en localhost
    await win.loadURL('http://localhost:5173')
  } else {
    // En producción, carga el build estático
    await win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  win.removeMenu()
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())


