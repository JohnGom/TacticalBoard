import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../ui/Brand";

export function LandingPage() {
  const { user } = useAuth();

  return (
    <main className="marketing-page">
      <header className="public-nav">
        <Brand />
        <nav className="public-nav__links" aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#equipos">Equipos</a>
        </nav>
        <div className="public-nav__actions">
          {user ? (
            <Link className="nav-login" to="/app">Mi espacio</Link>
          ) : (
            <>
              <Link className="nav-login" to="/login">Iniciar sesión</Link>
              <Link className="nav-create" to="/register">Crear cuenta</Link>
            </>
          )}
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero__copy">
          <p className="hero-kicker"><span /> Un espacio para pensar el juego</p>
          <h1>Haz visible la próxima jugada.</h1>
          <p className="landing-hero__lede">
            Prepara la alineación, dibuja los movimientos y comparte una idea clara con tu equipo.
          </p>
          <div className="landing-hero__actions">
            <Link className="button-primary button-primary--light" to={user ? "/app" : "/register"}>
              Crear mi pizarra <span aria-hidden="true">↗</span>
            </Link>
            {!user && <Link className="button-text-light" to="/login">Ya tengo una cuenta</Link>}
          </div>
          <p className="landing-hero__note">Empieza con un club o crea tu propio equipo.</p>
        </div>
        <figure className="hero-board">
          <img src="/tactical-board-hero.svg" alt="Pizarra táctica con una formación 4–3–3 y movimientos de ataque" />
          <figcaption><span className="hero-board__dot" /> Esquema de demostración <span>4–3–3</span></figcaption>
        </figure>
        <div className="hero-coordinate" aria-hidden="true">45° 26′ N / APUNTES DE BANDA</div>
      </section>

      <section className="landing-intro" id="como-funciona">
        <div className="landing-intro__heading">
          <p className="section-kicker">De la idea al movimiento</p>
          <h2>La cancha es el principio. Tu lectura del juego hace el resto.</h2>
        </div>
        <div className="landing-steps">
          <article className="landing-step">
            <span className="step-index">01</span>
            <h3>Elige el punto de partida</h3>
            <p>Usa un plantel disponible de un club o selección, o arma un equipo a tu manera.</p>
          </article>
          <article className="landing-step">
            <span className="step-index">02</span>
            <h3>Encuentra la forma</h3>
            <p>Parte de una formación y mueve cada jugador con libertad por la cancha.</p>
          </article>
          <article className="landing-step">
            <span className="step-index">03</span>
            <h3>Explica lo que ves</h3>
            <p>Convierte posiciones y movimientos en una conversación que todos puedan seguir.</p>
          </article>
        </div>
      </section>

      <section className="landing-teams" id="equipos">
        <div className="landing-teams__copy">
          <p className="section-kicker">Tu pizarra, tu equipo</p>
          <h2>Empieza con nombres conocidos o escribe los tuyos.</h2>
          <p>Los planteles reales aparecen cuando el proveedor tiene datos disponibles. También puedes crear un equipo personalizado con tus titulares, dorsales y suplentes.</p>
          <Link className="text-link" to={user ? "/app/boards/new" : "/register"}>Preparar una pizarra <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="team-choices" aria-label="Formas de preparar un equipo">
          <div className="team-choice team-choice--real">
            <div className="team-choice__glyph" aria-hidden="true"><span>R</span><span>11</span></div>
            <div><h3>Plantel real</h3><p>Busca un club o una selección y carga los jugadores disponibles.</p></div>
          </div>
          <div className="team-choice team-choice--custom">
            <div className="team-choice__glyph" aria-hidden="true"><span>+</span><span>XI</span></div>
            <div><h3>Equipo personalizado</h3><p>Define el nombre, color, titulares y banco.</p></div>
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <p className="section-kicker">La pizarra está lista</p>
          <h2>¿Qué quieres mostrarle a tu equipo?</h2>
        </div>
        <Link className="button-primary button-primary--dark" to={user ? "/app" : "/register"}>
          Empezar ahora <span aria-hidden="true">↗</span>
        </Link>
      </section>

      <footer className="public-footer">
        <Brand />
        <span>Una idea clara también cambia el partido.</span>
        <Link to="/login">Iniciar sesión</Link>
      </footer>
    </main>
  );
}
