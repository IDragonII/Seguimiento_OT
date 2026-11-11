import { useEffect, useRef, useState } from 'react'
import { Bell, LogOut, User } from 'lucide-react'
import { api } from '../../api/api'
import Modal from '../Modal'

function iniciales(usuario) {
  const a = (usuario?.nombres || '').trim().charAt(0)
  const b = (usuario?.apellidos || '').trim().charAt(0)
  return (a + b).toUpperCase() || '?'
}

const ESTILOS_ESTADO = {
  PENDIENTE: 'alerta-pendiente',
  ATENDIDA: 'alerta-atendida',
  DESCARTADA: 'alerta-descartada',
}

export default function ControlesPanel({ variante = 'panel' }) {
  const usuario = api.getUsuario()
  const [menu, setMenu] = useState(null) // 'alertas' | 'perfil'
  const [modal, setModal] = useState(null) // 'detalle' | 'perfil' | 'logout'
  const [alertas, setAlertas] = useState([])
  const [alertaSel, setAlertaSel] = useState(null)
  const raizRef = useRef(null)

  useEffect(() => {
    api
      .get('/alertas/mis-alertas')
      .then(setAlertas)
      .catch(() => setAlertas([]))
  }, [])

  useEffect(() => {
    if (!menu) return

    function alHacerClic(e) {
      if (raizRef.current && !raizRef.current.contains(e.target)) setMenu(null)
    }
    function alPresionar(e) {
      if (e.key === 'Escape') setMenu(null)
    }

    document.addEventListener('mousedown', alHacerClic)
    document.addEventListener('keydown', alPresionar)
    return () => {
      document.removeEventListener('mousedown', alHacerClic)
      document.removeEventListener('keydown', alPresionar)
    }
  }, [menu])

  const pendientes = alertas.length
  const inicialesUsuario = iniciales(usuario)

  function verAlerta(d) {
    setAlertaSel(d)
    setMenu(null)
    setModal('detalle')
  }

  return (
    <div className="controles-panel" ref={raizRef}>
      <button
        type="button"
        className="sigot-campana"
        aria-label="Notificaciones"
        aria-expanded={menu === 'alertas'}
        onClick={() => setMenu((m) => (m === 'alertas' ? null : 'alertas'))}
      >
        <Bell size={20} strokeWidth={1.8} aria-hidden="true" />
        {pendientes > 0 && <span className="sigot-badge">{pendientes}</span>}
      </button>

      {menu === 'alertas' && (
        <div className="dropdown-panel dropdown-alertas" role="menu" aria-label="Notificaciones">
          <div className="dropdown-titulo">
            <span>Notificaciones</span>
            {pendientes > 0 && <span className="dropdown-contador">{pendientes}</span>}
          </div>

          <div className="dropdown-lista">
            {alertas.length === 0 && (
              <div className="dropdown-vacio">Sin notificaciones</div>
            )}
            {alertas.map((d) => {
              const a = d.alerta
              const fecha = a?.fechaGeneracion
                ? new Date(a.fechaGeneracion).toLocaleString()
                : ''
              return (
                <button
                  key={d.id}
                  type="button"
                  className="dropdown-item"
                  onClick={() => verAlerta(d)}
                >
                  <span
                    className={`punto-alerta ${
                      ESTILOS_ESTADO[a?.estadoAlerta] || 'alerta-pendiente'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="dropdown-item-texto">
                    <strong>{a?.tipoAlerta || 'Alerta'}</strong>
                    <span>
                      OT #{a?.ordenTrabajo?.numeroOT ?? '—'} · {fecha}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        className="sigot-avatar-btn"
        aria-label="Menú de usuario"
        aria-expanded={menu === 'perfil'}
        onClick={() => setMenu((m) => (m === 'perfil' ? null : 'perfil'))}
      >
        <span className="sigot-avatar" aria-hidden="true">
          {inicialesUsuario}
        </span>
        {variante === 'panel' && (
          <span className="sigot-datos">
            <span className="sigot-nombre">
              {usuario?.nombres} {usuario?.apellidos}
            </span>
            <span className="sigot-rol">{usuario?.rol}</span>
          </span>
        )}
      </button>

      {menu === 'perfil' && (
        <div className="dropdown-panel dropdown-perfil" role="menu" aria-label="Usuario">
          <div className="dropdown-usuario">
            <span className="sigot-avatar" aria-hidden="true">
              {inicialesUsuario}
            </span>
            <span className="dropdown-usuario-datos">
              <strong>
                {usuario?.nombres} {usuario?.apellidos}
              </strong>
              <span>{usuario?.email}</span>
            </span>
          </div>

          <button
            type="button"
            className="dropdown-item"
            onClick={() => {
              setMenu(null)
              setModal('perfil')
            }}
          >
            <User size={16} strokeWidth={1.8} aria-hidden="true" />
            Mi perfil
          </button>
          <button
            type="button"
            className="dropdown-item peligro"
            onClick={() => {
              setMenu(null)
              setModal('logout')
            }}
          >
            <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      )}

      {modal === 'detalle' && alertaSel && (
        <Modal
          titulo="Detalle de la alerta"
          ancho={470}
          onCerrar={() => {
            setModal(null)
            setAlertaSel(null)
          }}
        >
          {(() => {
            const a = alertaSel.alerta
            const ot = a?.ordenTrabajo
            return (
              <div className="alerta-detalle">
                <div className="alerta-detalle-fila">
                  <span className="etiqueta">Tipo</span>
                  <span className="valor">{a?.tipoAlerta || '—'}</span>
                </div>
                <div className="alerta-detalle-fila">
                  <span className="etiqueta">Orden de trabajo</span>
                  <span className="valor">{ot ? `#${ot.numeroOT}` : '—'}</span>
                </div>
                <div className="alerta-detalle-fila">
                  <span className="etiqueta">Generada</span>
                  <span className="valor">
                    {a?.fechaGeneracion
                      ? new Date(a.fechaGeneracion).toLocaleString()
                      : '—'}
                  </span>
                </div>
                <div className="alerta-detalle-fila">
                  <span className="etiqueta">Estado</span>
                  <span className={`badge-estado ${ESTILOS_ESTADO[a?.estadoAlerta] || ''}`}>
                    {a?.estadoAlerta || '—'}
                  </span>
                </div>
                {a?.diasHabilesTranscurridos != null && (
                  <div className="alerta-detalle-fila">
                    <span className="etiqueta">Días hábiles</span>
                    <span className="valor">
                      {a.diasHabilesTranscurridos} / {a.diasHabilesMaximos ?? '—'}
                    </span>
                  </div>
                )}
                {a?.observacion && (
                  <div className="alerta-detalle-nota">
                    <span className="etiqueta">Observación</span>
                    <p>{a.observacion}</p>
                  </div>
                )}
              </div>
            )
          })()}
        </Modal>
      )}

      {modal === 'perfil' && (
        <Modal titulo="Mi perfil" ancho={430} onCerrar={() => setModal(null)}>
          <div className="perfil-card">
            <div className="perfil-avatar" aria-hidden="true">
              {inicialesUsuario}
            </div>
            <h3 className="perfil-nombre">
              {usuario?.nombres} {usuario?.apellidos}
            </h3>
            <span className="perfil-rol">{usuario?.rol}</span>

            <dl className="perfil-datos">
              <div>
                <dt>Correo</dt>
                <dd>{usuario?.email}</dd>
              </div>
              <div>
                <dt>Identificador</dt>
                <dd>{usuario?.id ?? '—'}</dd>
              </div>
            </dl>
          </div>
        </Modal>
      )}

      {modal === 'logout' && (
        <Modal titulo="Cerrar sesión" ancho={400} onCerrar={() => setModal(null)}>
          <p className="logout-texto">
            ¿Seguro que deseas cerrar sesión? Tendrás que volver a iniciar sesión
            para entrar al sistema.
          </p>
          <div className="modal-acciones">
            <button type="button" className="btn-secundario" onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button type="button" className="btn-peligro" onClick={() => api.logout()}>
              Cerrar sesión
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
