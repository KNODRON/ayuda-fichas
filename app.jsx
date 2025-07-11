import { useState } from 'react'
import * as XLSX from 'xlsx'

export default function App() {
  const [templates, setTemplates] = useState([])
  const [columns, setColumns]   = useState([])
  const [values, setValues]     = useState({})
  const [output, setOutput]     = useState('')

  // Al montar, lista archivos de /assets/templates
  useState(() => {
    fetch('/templates/').then(r => r.json()).then(list => {
      setTemplates(list.filter(f=>f.endsWith('.xlsx')))
    })
  }, [])

  // Cuando el usuario selecciona un archivo
  const onSelect = async e => {
    const file = e.target.files[0]
    const data = await file.arrayBuffer()
    const wb   = XLSX.read(data)
    const hdrs = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header:1 })[0]
    setColumns(hdrs)
    setValues(Object.fromEntries(hdrs.map(h=>[h, ''])))
  }

  // Generar texto con el formato que ya conoces
  const generar = () => {
    const txt = `» FECHA ${values['Fecha']}, ${values['Entrada/Salida']} POR EL TERMINAL ${values['Terminal']}, VÍA ${values['Vía']}, POR MEDIO DE ${values['Medio']}, PAÍS ${values['País']}`
    navigator.clipboard.writeText(txt)
    setOutput(txt)
  }

  return (
    <div className="p-4">
      <h1>Ayuda Fichas</h1>
      <input type="file" accept=".xlsx" onChange={onSelect} />
      <div className="mt-4 space-y-2">
        {columns.map(h => (
          <div key={h}>
            <label>{h}</label>
            <input
              className="border px-2"
              value={values[h] || ''}
              onChange={e => setValues(v=>({ ...v, [h]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <button className="mt-4 px-4 py-2 bg-blue-600 text-white" onClick={generar}>
        Generar y copiar
      </button>
      {output && <pre className="mt-4 p-2 bg-gray-100">{output}</pre>}
    </div>
  )
}

