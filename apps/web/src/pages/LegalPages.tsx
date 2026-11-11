import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Brand } from "../ui/Brand";

const lastUpdated = "11 de noviembre de 2026";

export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Información legal" className={`legal-links ${className}`.trim()}>
      <Link to="/privacy">Privacidad</Link>
      <Link to="/terms">Condiciones de servicio</Link>
    </nav>
  );
}

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | TacticalBoard`;
    return () => { document.title = previousTitle; };
  }, [title]);

  return (
    <div className="legal-page">
      <a className="skip-link" href="#legal-main">Saltar al contenido principal</a>
      <header className="legal-topbar">
        <Brand />
        <Link to="/">Volver a TacticalBoard</Link>
      </header>
      <main className="legal-document" id="legal-main">
        <div className="legal-document__intro">
          <p className="section-kicker">TacticalBoard · Información legal</p>
          <h1>{title}</h1>
          <p className="legal-document__updated">Última actualización: {lastUpdated}</p>
        </div>
        {children}
      </main>
      <footer className="legal-footer">
        <span>Una idea clara también cambia el partido.</span>
        <LegalLinks />
      </footer>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Política de privacidad">
      <div className="legal-sections">
        <section>
          <h2>Quién gestiona tus datos</h2>
          <p>
            TacticalBoard es una aplicación para crear y guardar pizarras tácticas, planteles y equipos personalizados. El responsable de los datos de esta instancia es John Gomez Vega, con domicilio en Colombia. Los datos de contacto para consultas y solicitudes de privacidad aparecen al final de esta política.
          </p>
        </section>

        <section>
          <h2>Qué información usamos</h2>
          <ul>
            <li><strong>Cuenta:</strong> nombre visible y correo electrónico. Si creas una cuenta con contraseña, el servidor conserva una verificación criptográfica con sal; no guarda la contraseña en texto legible.</li>
            <li><strong>Acceso con Google:</strong> cuando eliges Google, TacticalBoard solicita únicamente los permisos estándar <code>openid</code>, <code>email</code> y <code>profile</code>. Recibe el identificador de cuenta de Google, el correo verificado y el nombre visible. No solicita acceso a Gmail, Drive ni contactos, ni conserva tokens de acceso de Google.</li>
            <li><strong>Contenido del espacio:</strong> nombres y colores de equipos, planteles, dorsales, posiciones y estado editable de las pizarras, incluidos los nombres y datos de referencia de jugadores que decidas añadir.</li>
            <li><strong>Sesiones:</strong> se usa una cookie firmada y protegida para mantener tu sesión. En producción es <code>HttpOnly</code>, <code>Secure</code> y <code>SameSite=Lax</code>; la sesión vence a los 14 días. El flujo de Google usa además una cookie temporal de estado que vence a los 10 minutos.</li>
            <li><strong>Búsquedas de fútbol:</strong> si buscas equipos o cargas planteles, el servidor consulta API-Football (API-Sports) usando el texto o identificador del equipo solicitado. Los resultados pueden incluir nombres, dorsales, posiciones e identificadores del proveedor.</li>
          </ul>
        </section>

        <section>
          <h2>Para qué usamos la información</h2>
          <p>
            Usamos los datos de cuenta para autenticarte; las sesiones para mantener el acceso; tus equipos y pizarras para guardar, restaurar y editar tu trabajo; y las búsquedas de fútbol para devolver equipos, planteles y referencias de alineaciones. Las búsquedas del proveedor se mantienen en una caché temporal del servidor durante un máximo aproximado de cinco minutos.
          </p>
        </section>

        <section>
          <h2>Con quién se comparte</h2>
          <p>
            Google participa cuando inicias sesión con Google y API-Football (API-Sports) recibe las consultas necesarias para ofrecer datos de fútbol. El operador también utiliza el alojamiento y la base de datos configurados para esa instancia. No hay una función de publicación o de compartir pizarras con otros usuarios en la versión actual.
          </p>
          <p>
            Si guardas en una pizarra o equipo información procedente de un plantel, esa información pasa a formar parte del contenido de tu espacio para que puedas restaurarlo y editarlo. Los datos se consultan en el servidor; la clave de API-Football no se envía al navegador.
          </p>
        </section>

        <section>
          <h2>Conservación y eliminación</h2>
          <p>
            Los datos de cuenta y el contenido guardado se conservan mientras la cuenta siga activa o hasta que el operador los elimine. El servidor elimina sesiones vencidas cuando se crean nuevas sesiones. En esta versión no existe una opción de autoservicio para eliminar toda la cuenta: puedes solicitarlo al contacto de privacidad indicado al final de esta política. Revocar el acceso de TacticalBoard desde tu cuenta de Google impide futuras autorizaciones, pero por sí solo no elimina la cuenta ni las pizarras ya guardadas en TacticalBoard.
          </p>
        </section>

        <section>
          <h2>Seguridad y tus opciones</h2>
          <p>
            Las contraseñas se almacenan como hashes con sal, las sesiones se firman y los datos privados del espacio se consultan con controles de propietario. Ninguna transmisión o almacenamiento en Internet puede garantizar seguridad absoluta. Puedes dejar de usar el servicio, cerrar sesión y solicitar acceso, corrección o eliminación de tus datos mediante el contacto indicado al final de esta política.
          </p>
        </section>

        <section>
          <h2>Responsable y contacto de privacidad</h2>
          <dl className="legal-contact-details">
            <div><dt>Responsable</dt><dd>John Gomez Vega</dd></div>
            <div><dt>País</dt><dd>Colombia</dd></div>
            <div>
              <dt>Correo para solicitudes de privacidad y eliminación</dt>
              <dd><a href="mailto:zemogpassive99@gmail.com">zemogpassive99@gmail.com</a></dd>
            </div>
          </dl>
        </section>
      </div>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Condiciones de servicio">
      <div className="legal-sections">
        <section>
          <h2>Sobre TacticalBoard</h2>
          <p>
            TacticalBoard permite crear pizarras de fútbol, organizar jugadores y equipos, y guardar el trabajo en un espacio privado asociado a una cuenta. Estas condiciones regulan el uso del servicio por parte de quien crea una cuenta o utiliza sus funciones.
          </p>
        </section>

        <section>
          <h2>Tu cuenta</h2>
          <p>
            Debes proporcionar información de cuenta que puedas usar y mantener protegidas tus credenciales. Eres responsable de la actividad realizada desde tu cuenta. Si detectas un acceso que no reconoces, deja de usar la sesión y contacta al operador mediante el correo indicado al final de estas condiciones.
          </p>
        </section>

        <section>
          <h2>Uso permitido</h2>
          <p>
            Puedes usar TacticalBoard para preparar y guardar material táctico. No debes utilizar el servicio para actividades ilícitas, intentar acceder a cuentas o datos ajenos, interferir con su funcionamiento ni cargar contenido que no tengas derecho a utilizar.
          </p>
        </section>

        <section>
          <h2>Tu contenido y los datos de fútbol</h2>
          <p>
            Conservas los derechos que tengas sobre los nombres, equipos y demás contenido que aportes. Nos autorizas a almacenarlo, procesarlo y mostrarlo dentro de tu espacio únicamente para proporcionar las funciones de TacticalBoard. Tus pizarras son privadas en la versión actual y no hay herramientas de publicación pública o colaboración.
          </p>
          <p>
            La búsqueda de equipos y planteles depende de API-Football (API-Sports), sus condiciones, disponibilidad, cobertura y límites de uso. Los datos pueden estar incompletos o cambiar; las alineaciones se ofrecen como referencia y puedes editarlas. El servicio no garantiza que todos los equipos o datos estén disponibles. Los escudos y fotos de terceros no forman parte de la integración actual.
          </p>
        </section>

        <section>
          <h2>Disponibilidad y cambios</h2>
          <p>
            El operador puede actualizar, suspender o retirar funciones para mantener o mejorar el servicio. Se tomarán medidas razonables para proteger el acceso, pero no se garantiza disponibilidad ininterrumpida ni que el servicio esté libre de errores. Mantén copias de la información que sea importante para ti.
          </p>
        </section>

        <section>
          <h2>Suspensión o cierre de una cuenta</h2>
          <p>
            El operador puede limitar el acceso cuando sea necesario para proteger el servicio, cumplir la ley o responder a un uso que incumpla estas condiciones. Puedes dejar de usar el servicio en cualquier momento. Para solicitar el cierre y eliminación de una cuenta, utiliza el contacto de privacidad indicado a continuación.
          </p>
        </section>

        <section>
          <h2>Responsable y legislación aplicable</h2>
          <dl className="legal-contact-details">
            <div><dt>Responsable</dt><dd>John Gomez Vega</dd></div>
            <div><dt>Correo de contacto</dt><dd><a href="mailto:zemogpassive99@gmail.com">zemogpassive99@gmail.com</a></dd></div>
            <div><dt>País y legislación aplicable</dt><dd>Colombia. Se aplica la legislación colombiana vigente, sin perjuicio de las normas imperativas que protejan a los usuarios.</dd></div>
          </dl>
          <p>
            Estas condiciones no limitan los derechos que no puedan excluirse conforme a la legislación aplicable. Si tienes dudas sobre el servicio, contacta al operador mediante los datos indicados en esta sección.
          </p>
        </section>
      </div>
    </LegalLayout>
  );
}
