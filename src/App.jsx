import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import Swal from 'sweetalert2'
import './App.css'

function App() {
  const BRAND_PRIMARY = '#0b4ea2'
  const BRAND_ACCENT = '#00b5e2'

  const hexToRgb = (hex) => {
    const m = hex.replace('#', '')
    const bigint = parseInt(m, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return [r, g, b]
  }

  const [tecnico, setTecnico] = useState('')
  const [fechaSolicitud, setFechaSolicitud] = useState('')

  const getToday = () => {
    const d = new Date()
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const [fechaRealizacion, setFechaRealizacion] = useState(getToday())
  const [actividad, setActividad] = useState('')
  const [dispositivo, setDispositivo] = useState('')
  const [unidad, setUnidad] = useState('')
  const [detalles, setDetalles] = useState('')
  const [comentarios, setComentarios] = useState('')

  const [equipos, setEquipos] = useState([])
  const [isSent, setIsSent] = useState(false)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    setIsSent(false)
  }, [tecnico, fechaSolicitud, equipos])

  const limpiarCamposEquipo = () => {
    setFechaRealizacion(getToday())
    setActividad('')
    setDispositivo('')
    setUnidad('')
    setDetalles('')
    setComentarios('')
  }

  const agregarEquipo = (e) => {
    e.preventDefault()
    const todosVacios =
      !fechaRealizacion &&
      !actividad &&
      !dispositivo &&
      !unidad &&
      !detalles &&
      !comentarios
    if (todosVacios) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Ingresa al menos un dato antes de agregar al listado.',
      })
      return
    }
    const nuevo = {
      fechaRealizacion,
      actividad,
      dispositivo,
      unidad,
      detalles,
      comentarios,
    }
    setEquipos((prev) => [...prev, nuevo])
    limpiarCamposEquipo()
  }

  const eliminarEquipo = (idx) => {
    setEquipos((prev) => prev.filter((_, i) => i !== idx))
  }

  const enviar = async (e) => {
    e.preventDefault()
    if (!tecnico || !fechaSolicitud) {
      Swal.fire({
        icon: 'error',
        title: 'Faltan datos',
        text: 'Completa el nombre del técnico y la fecha de solicitud.',
      })
      return
    }
    if (equipos.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Listado vacío',
        text: 'Agrega al menos un equipo al listado antes de enviar.',
      })
      return
    }
    const camposRequeridos = [
      'fechaRealizacion',
      'actividad',
      'dispositivo',
      'unidad',
      'detalles',
      'comentarios',
    ]
    for (let i = 0; i < equipos.length; i++) {
      const eq = equipos[i]
      const faltantes = camposRequeridos.filter((c) => !eq[c])
      if (faltantes.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Faltan campos por llenar',
          html: `Revisa la fila #${i + 1}. Faltan: <b>${faltantes.join(
            ', '
          )}</b>`,
        })
        return
      }
    }
    const WEBHOOK_URL = import.meta.env.VITE_SHEETS_WEBHOOK_URL
    if (!WEBHOOK_URL) {
      alert('Falta configurar VITE_SHEETS_WEBHOOK_URL en tu archivo .env')
      return
    }

    const payload = { tecnico, fechaSolicitud, equipos }
    setIsSending(true)
    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      })
      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`Error ${resp.status}: ${text}`)
      }
      Swal.fire({
        icon: 'success',
        title: 'Enviado',
        text: 'Reporte enviado a la hoja correctamente.',
      })
      setIsSent(true)
      setEquipos([]) // limpiar lista al enviar
    } catch (err) {
      console.warn('Fallo el POST estándar, reintentando con no-cors...', err)
      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        })
        Swal.fire({
          icon: 'info',
          title: 'Enviado (no-cors)',
          text: 'Verifica la hoja para confirmar recepción.',
        })
        setIsSent(true)
        setEquipos([]) // limpiar lista al enviar
      } catch (err2) {
        console.error('Error al enviar a la hoja (no-cors):', err2)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo enviar a la hoja. Revisa la consola para más detalles.',
        })
      }
    } finally {
      setIsSending(false)
    }
  }

  const descargarPDF = async () => {
    if (!tecnico || !fechaSolicitud) {
      alert(
        'Completa los campos globales: Nombre del técnico y Fecha de Solicitud antes de descargar el PDF.'
      )
      return
    }
    if (equipos.length === 0) {
      alert('Agrega al menos un equipo al listado antes de descargar el PDF.')
      return
    }
    try {
      const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' })
      const margin = { left: 32, right: 32, top: 72, bottom: 56 }

      const addHeaderFooter = (data) => {
        const pageWidth = doc.internal.pageSize.getWidth()
        const [pr, pg, pb] = hexToRgb(BRAND_PRIMARY)
        doc.setFillColor(pr, pg, pb)
        doc.rect(0, 0, pageWidth, 56, 'F')
        doc.setFontSize(16)
        doc.setTextColor(255)
        doc.text('Reporte de Servicio', pageWidth / 2, 24, { align: 'center' })
        doc.setFontSize(10)
        const meta = `Técnico: ${tecnico || '-'}  |  Fecha de Solicitud: ${
          fechaSolicitud || '-'
        }`
        doc.text(meta, pageWidth / 2, 42, { align: 'center' })
        const pageCount = doc.internal.getNumberOfPages()
        const str = `Página ${data.pageNumber} de ${pageCount}`
        doc.setFontSize(9)
        doc.setTextColor(110)
        doc.text(
          str,
          pageWidth - margin.right,
          doc.internal.pageSize.getHeight() - 24,
          { align: 'right' }
        )
      }

      const head = [
        [
          'Tecnico',
          'FechaSolicitud',
          'FechaRealizacion',
          'Actividad',
          'Dispositivo',
          'Unidad',
          'Detalles',
          'Comentarios',
        ],
      ]
      const body = equipos.map((eq) => [
        tecnico,
        fechaSolicitud,
        eq.fechaRealizacion,
        eq.actividad,
        eq.dispositivo,
        eq.unidad,
        eq.detalles,
        eq.comentarios,
      ])

      const usableWidth =
        doc.internal.pageSize.getWidth() - margin.left - margin.right
      const widths = {
        tecnico: 70,
        fechaSol: 80,
        fechaReal: 80,
        actividad: 90,
        dispositivo: 85,
        unidad: 70,
        comentarios: 200,
      }
      const anchoDetalles = Math.max(
        usableWidth -
          (widths.tecnico +
            widths.fechaSol +
            widths.fechaReal +
            widths.actividad +
            widths.dispositivo +
            widths.unidad +
            widths.comentarios),
        150
      )
      autoTable(doc, {
        head,
        body,
        theme: 'grid',
        startY: margin.top + 10,
        margin,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'top',
          lineHeight: 1.15,
          lineColor: [220, 220, 220],
          lineWidth: 0.4,
        },
        headStyles: {
          fillColor: hexToRgb(BRAND_PRIMARY),
          textColor: 255,
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
        },
        bodyStyles: { textColor: 30 },
        columnStyles: {
          0: { cellWidth: widths.tecnico, halign: 'center' },
          1: { cellWidth: widths.fechaSol, halign: 'center' },
          2: { cellWidth: widths.fechaReal, halign: 'center' },
          3: { cellWidth: widths.actividad, halign: 'center' },
          4: { cellWidth: widths.dispositivo, halign: 'center' },
          5: { cellWidth: widths.unidad, halign: 'center' },
          6: { cellWidth: anchoDetalles, halign: 'left', overflow: 'linebreak' },
          7: { cellWidth: widths.comentarios, halign: 'left', overflow: 'linebreak' },
        },
        tableWidth: usableWidth,
        didDrawPage: addHeaderFooter,
      })

      doc.save(`reporte_${tecnico}_${fechaSolicitud}.pdf`)
    } catch (err) {
      console.error(err)
      alert(
        'Ocurrió un error al generar el PDF. Revisa la consola para más detalles.'
      )
    }
  }

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>Reporte de Servicio</h1>
          <p className="subtitle">
            Captura las actividades realizadas y genera el comprobante en PDF o
            envíalo a la hoja.
          </p>
        </div>
        <div className="header-meta">
          <span className="badge">Equipos: {equipos.length}</span>
        </div>
      </header>

      <form className="form" onSubmit={enviar}>
        <fieldset className="fieldset">
          <legend>Datos del Técnico</legend>
          <div className="grid">
            <div className="field">
              <label htmlFor="tecnico">
                ¿Nombre del técnico? (Primer nombre) *
              </label>
              <input
                id="tecnico"
                type="text"
                value={tecnico}
                onChange={(e) => setTecnico(e.target.value)}
                placeholder="Ej. Juan"
              />
            </div>
            <div className="field">
              <label htmlFor="fechaSolicitud">Fecha de Solicitud *</label>
              <input
                id="fechaSolicitud"
                type="date"
                value={fechaSolicitud}
                onChange={(e) => setFechaSolicitud(e.target.value)}
              />
            </div>
          </div>
          <div className="hint">
            Estos datos se aplicarán a todos los equipos del listado.
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Registro por equipo</legend>
          <div className="grid">
            <div className="field">
              <label htmlFor="fechaRealizacion">Fecha de Realización *</label>
              <input
                id="fechaRealizacion"
                type="date"
                value={fechaRealizacion}
                onChange={(e) => setFechaRealizacion(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="actividad">Actividad Realizada *</label>
              <select
                id="actividad"
                value={actividad}
                onChange={(e) => setActividad(e.target.value)}
              >
                <option value="" disabled>
                  Selecciona una actividad
                </option>
                <option>MTTO CORRECTIVO</option>
                <option>MTTO PREVENTIVO</option>
                <option>INSTALACION</option>
                <option>DESINSTALACIÓN</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="dispositivo">Dispositivo a tratar *</label>
              <select
                id="dispositivo"
                value={dispositivo}
                onChange={(e) => setDispositivo(e.target.value)}
              >
                <option value="" disabled>
                  Selecciona un dispositivo
                </option>
                <option>GPS</option>
                <option>CAMARA</option>
                <option>LECTORA</option>
                <option>EQUIPOS DIDCOM</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="unidad">Unidad *</label>
              <input
                id="unidad"
                type="text"
                value={unidad}
                onChange={(e) => setUnidad(e.target.value)}
                placeholder="Ej. Unidad 123"
              />
            </div>
          </div>

          <div className="grid">
            <div className="field col-2">
              <label htmlFor="detalles">Detalles de la solicitud *</label>
              <textarea
                id="detalles"
                rows={3}
                value={detalles}
                onChange={(e) => setDetalles(e.target.value)}
                placeholder="Describe la solicitud..."
              />
            </div>
            <div className="field col-2">
              <label htmlFor="comentarios">Comentarios de la Visita *</label>
              <textarea
                id="comentarios"
                rows={3}
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Observaciones, notas, etc."
              />
            </div>
          </div>

          <div className="actions">
            <button
              type="button"
              className="btn secondary"
              onClick={agregarEquipo}
            >
              Agregar al listado
            </button>
            <span className="muted">
              Puedes agregar varios equipos uno por uno.
            </span>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>Listado de equipos</legend>
          {equipos.length === 0 ? (
            <p className="muted">Aún no hay equipos agregados.</p>
          ) : (
            <div className="table-wrapper">
              <table className="pretty">
                <thead>
                  <tr>
                    <th>Tecnico</th>
                    <th>FechaSolicitud</th>
                    <th>FechaRealizacion</th>
                    <th>Actividad</th>
                    <th>Dispositivo</th>
                    <th>Unidad</th>
                    <th>Detalles</th>
                    <th>Comentarios</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equipos.map((eq, i) => (
                    <tr key={i}>
                      <td data-label="Tecnico">{tecnico}</td>
                      <td data-label="FechaSolicitud">{fechaSolicitud}</td>
                      <td data-label="FechaRealizacion">
                        <span className="chip">{eq.fechaRealizacion}</span>
                      </td>
                      <td data-label="Actividad">
                        <span className="chip info">{eq.actividad}</span>
                      </td>
                      <td data-label="Dispositivo">
                        <span className="chip warn">{eq.dispositivo}</span>
                      </td>
                      <td data-label="Unidad">{eq.unidad}</td>
                      <td className="wrap" data-label="Detalles">
                        {eq.detalles}
                      </td>
                      <td className="wrap" data-label="Comentarios">
                        {eq.comentarios}
                      </td>
                      <td data-label="Acciones">
                        <button
                          type="button"
                          className="btn small danger"
                          onClick={() => eliminarEquipo(i)}
                          title="Eliminar"
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </fieldset>

        <div className="sticky-actions">
          <div className="left">
            <span className="muted">
              Técnico: {tecnico || '—'} · Solicitud: {fechaSolicitud || '—'}
            </span>
          </div>
          <div className="right">
            {isSent && (
              <button
                type="button"
                className="btn"
                onClick={descargarPDF}
                disabled={equipos.length === 0 || isSending}
              >
                Descargar PDF
              </button>
            )}
            <button type="submit" className="btn primary" disabled={isSending}>
              {isSending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </div>
      </form>
      {isSending && (
        <div className="backdrop">
          <div className="loader" aria-label="Enviando"></div>
        </div>
      )}
    </div>
  )
}

export default App
