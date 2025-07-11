// electron-main.js
const { app, BrowserWindow } = require('electron')
const path = require('path')

async function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: { contextIsolation: true }
  })

  if (process.env.NODE_ENV === 'development') {
    await win.loadURL('http://localhost:5174')
  } else {
    await win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  }

  win.removeMenu()
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
