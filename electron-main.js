const { app, BrowserWindow } = require('electron')
const path = require('path')
const serve = require('electron-serve')

const loadURL = serve({ directory: path.join(__dirname, 'dist') })

async function createWindow() {
  await loadURL()
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: { contextIsolation: true }
  })
  win.removeMenu()
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())

