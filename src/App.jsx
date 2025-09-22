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

  // ====== estados ======
  const [empresa, setEmpresa] = useState('DIDCOM')
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
  const [isSending, setIsSending] = useState(false)

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
    // ✅ Validar que TODOS los campos estén llenos
    if (
      !fechaRealizacion ||
      !actividad ||
      !dispositivo ||
      !unidad ||
      !detalles ||
      !comentarios
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Debes llenar todos los campos antes de agregar al listado.',
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
    Swal.fire({
      icon: 'success',
      title: 'Agregado',
      text: `La unidad "${unidad}" fue agregada al listado.`,
      timer: 2000,
      showConfirmButton: false,
    })
    limpiarCamposEquipo()
  }

  const eliminarEquipo = (idx) => {
    setEquipos((prev) => prev.filter((_, i) => i !== idx))
  }

  const descargarPDF = (equiposParaPDF) => {
    try {
      const doc = new jsPDF({ orientation: 'l', unit: 'pt', format: 'a4' })
      const margin = { left: 10, right: 10, top: 72, bottom: 56 }

      const addHeaderFooter = (data) => {
        const pageWidth = doc.internal.pageSize.getWidth()
        const [pr, pg, pb] = hexToRgb(BRAND_PRIMARY)
        doc.setFillColor(pr, pg, pb)
        doc.rect(0, 0, pageWidth, 56, 'F')
        doc.setFontSize(16)
        doc.setTextColor(255)
        doc.text(
          `Reporte de Servicio ${empresa}`,
          pageWidth / 2,
          24,
          { align: 'center' }
        )
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

      const head = [[
        'Tecnico','FechaSolicitud','FechaRealizacion',
        'Actividad','Dispositivo','Unidad','Detalles','Comentarios'
      ]]
      const body = equiposParaPDF.map((eq) => [
        tecnico,
        fechaSolicitud,
        eq.fechaRealizacion,
        eq.actividad,
        eq.dispositivo,
        eq.unidad,
        eq.detalles,
        eq.comentarios,
      ])

      const usableWidth = doc.internal.pageSize.getWidth() - margin.left - margin.right

      const widths = {
        tecnico: 60,
        fechaSol: 70,
        fechaReal: 70,
        actividad: 80,
        dispositivo: 80,
        unidad: 60,
        comentarios: 220,
      }
      const anchoDetalles = Math.max(
        usableWidth -
          (widths.tecnico + widths.fechaSol + widths.fechaReal +
            widths.actividad + widths.dispositivo + widths.unidad +
            widths.comentarios),
        140
      )

      autoTable(doc, {
        head, body,
        theme: 'grid',
        startY: margin.top + 10,
        margin,
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'top',
          lineHeight: 1.2,
        },
        headStyles: {
          fillColor: hexToRgb(BRAND_PRIMARY),
          textColor: 255,
          fontSize: 8,
          halign: 'center',
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

      doc.save(`reporte_${empresa}_${tecnico}_${fechaSolicitud}.pdf`)
    } catch (err) {
      console.error(err)
      alert('Ocurrió un error al generar el PDF.')
    }
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

    const WEBHOOK_URL =
      empresa === 'DIDCOM'
        ? import.meta.env.VITE_SHEETS_WEBHOOK_DIDCOM
        : import.meta.env.VITE_SHEETS_WEBHOOK_SITWIFI

    if (!WEBHOOK_URL) {
      alert('Falta configurar URL del webhook en tu archivo .env')
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
        text: `Reporte enviado a la hoja ${empresa} correctamente.`,
      })

      descargarPDF(equipos)
      setEquipos([])
    } catch (err) {
      console.warn('Fallo POST estándar', err)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo enviar el reporte.',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="container">
      <header className="app-header">
        <div>
          <h1>Reporte de Servicio</h1>
          <p className="subtitle">
            Captura las actividades realizadas y genera el comprobante en PDF o envíalo a la hoja.
          </p>
        </div>
        <div className="header-meta">
          <label>
            Empresa:
            <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
              <option value="DIDCOM">DIDCOM</option>
              <option value="SITWIFI">SITWIFI</option>
            </select>
          </label>
          <span className="badge">Equipos: {equipos.length}</span>
        </div>
      </header>

      <form className="form" onSubmit={enviar}>
        {/* Datos del técnico */}
        <fieldset className="fieldset">
          <legend>Datos del Técnico</legend>
          <div className="grid">
            <div className="field">
              <label htmlFor="tecnico">¿Nombre del técnico? *</label>
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
        </fieldset>

        {/* Registro por equipo */}
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
                <option value="" disabled>Selecciona una actividad</option>
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
                <option value="" disabled>Selecciona un dispositivo</option>
                {empresa === 'DIDCOM' ? (
                  <>
                    <option>GPS</option>
                    <option>CAMARA</option>
                    <option>LECTORA</option>
                    <option>EQUIPOS DIDCOM</option>
                  </>
                ) : (
                  <option>Peplink</option>
                )}
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
            <button type="button" className="btn secondary" onClick={agregarEquipo}>
              Agregar al listado
            </button>
            <span className="muted">Puedes agregar varios equipos uno por uno.</span>
          </div>
        </fieldset>

        {/* Listado */}
        <fieldset className="fieldset">
          <legend>Listado de equipos</legend>
          {equipos.length === 0 ? (
            <p className="muted">Aún no hay equipos agregados.</p>
          ) : (
            <div className="table-wrapper">
              <table className="pretty">
                <thead>
                  <tr>
                    <th>Tecnico</th><th>FechaSolicitud</th><th>FechaRealizacion</th>
                    <th>Actividad</th><th>Dispositivo</th><th>Unidad</th>
                    <th>Detalles</th><th>Comentarios</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {equipos.map((eq, i) => (
                    <tr key={i}>
                      <td>{tecnico}</td>
                      <td>{fechaSolicitud}</td>
                      <td><span className="chip">{eq.fechaRealizacion}</span></td>
                      <td><span className="chip info">{eq.actividad}</span></td>
                      <td><span className="chip warn">{eq.dispositivo}</span></td>
                      <td>{eq.unidad}</td>
                      <td className="wrap">{eq.detalles}</td>
                      <td className="wrap">{eq.comentarios}</td>
                      <td>
                        <button
                          type="button"
                          className="btn small danger"
                          onClick={() => eliminarEquipo(i)}
                          title="Eliminar"
                        >🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </fieldset>

        {/* Acciones */}
        <div className="sticky-actions">
          <div className="left">
            <span className="muted">
              Técnico: {tecnico || '—'} · Solicitud: {fechaSolicitud || '—'}
            </span>
          </div>
          <div className="right">
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
