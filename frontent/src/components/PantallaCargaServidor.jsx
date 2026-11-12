export default function PantallaCargaServidor({ despertando = false }) {
  return (
    <div className="login-wrap">
      <div className="carga-servidor" data-carga-servidor>
        <div className="spinner" />
        <h2>{despertando ? 'Despertando el servidor…' : 'Verificando el servidor…'}</h2>
        {despertando && (
          <p>
            La primera conexión puede tardar hasta un minuto. En cuanto responda, se abrirá
            el login.
          </p>
        )}
      </div>
    </div>
  )
}
