import { useEffect } from 'react'

export default function Modal({ titulo, onCerrar, children, ancho = 720 }) {
  useEffect(() => {
    function alPresionar(e) {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', alPresionar)
    return () => document.removeEventListener('keydown', alPresionar)
  }, [onCerrar])

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className="modal-panel" style={{ maxWidth: ancho }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button className="modal-cerrar" type="button" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
