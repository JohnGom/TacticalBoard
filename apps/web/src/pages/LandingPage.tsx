import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../ui/Brand";

export function LandingPage() {
  const { user } = useAuth();

  useEffect(() => {
    let disposed = false;
    let momentRoot: Element | null = null;
    let unmountMoments: ((root?: ParentNode) => void) | undefined;
    const momentUrl = new URL("/assets/moments/moments.js", window.location.origin).href;
    type MomentRuntime = {
      mountAll: (root?: ParentNode) => Promise<unknown>;
      unmountAll: (root?: ParentNode) => void;
    };

    void (import(/* @vite-ignore */ momentUrl) as Promise<MomentRuntime>).then((runtime) => {
      if (disposed) return;
      momentRoot = document.querySelector(".marketing-page");
      unmountMoments = runtime.unmountAll;
      if (momentRoot) void runtime.mountAll(momentRoot);
    }).catch(() => {
      document.querySelectorAll<HTMLElement>("[data-moment]").forEach((element) => element.classList.add("mo-safe"));
    });

    return () => {
      disposed = true;
      if (momentRoot) unmountMoments?.(momentRoot);
    };
  }, []);

  return (
    <>
      <header className="public-nav">
        <div className="wrap">
          <a className="skip-link" href="#landing-main">Saltar al contenido principal</a>
          <Brand inverse />
          <nav className="public-nav__links" aria-label="Navegación principal">
            <a href="#como-funciona">Pasos para la pizarra</a>
            <a href="#equipos">Planteles</a>
          </nav>
          <div className="public-nav__actions">
            {user ? (
              <Link className="nav-login" to="/app">Mi espacio</Link>
            ) : (
              <>
                <Link className="nav-login" to="/login">Iniciar sesión</Link>
                <Link className="nav-create" to="/register">Crear mi pizarra</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="marketing-page" id="top">
        <section className="landing-hero" id="landing-main">
          <div className="wrap">
            <div className="hero-text landing-hero__layout">
              <div className="landing-hero__copy">
                <p className="hero-kicker"><span /> Un espacio para pensar el juego</p>
                <h1>Crea una pizarra táctica para tu equipo.</h1>
                <p className="landing-hero__lede">
                  Prepara la alineación, ordena los movimientos y conserva una idea clara para tu equipo.
                </p>
                <div className="landing-hero__actions">
                  <Link className="button-primary button-primary--light" to={user ? "/app" : "/register"}>
                    Crear mi pizarra <span aria-hidden="true">↗</span>
                  </Link>
                  {!user && <Link className="button-text-light" to="/login">Ya tengo una cuenta</Link>}
                </div>
                <p className="landing-hero__note">3 formaciones iniciales: 4-3-3, 4-4-2 y 4-2-3-1.</p>
              </div>
              <div className="hero-board">
                <img src="/tactical-board-hero.svg" alt="Pizarra táctica con una formación 4–3–3 y movimientos de ataque" />
              </div>
            </div>
          </div>
        </section>

        <section className="landing-intro" id="como-funciona">
          <div className="wrap">
            <div className="landing-intro__heading">
              <p className="section-kicker">De la idea al movimiento</p>
              <h2>Tres pasos para preparar una pizarra táctica.</h2>
            </div>
            <div className="landing-steps">
              <div className="landing-demo-board" role="img" aria-label="Vista previa de una pizarra táctica 4-3-3">
                <div className="landing-demo-board__bar"><span>Esquema táctico</span><strong>4–3–3</strong></div>
                <div className="landing-demo-board__pitch" aria-hidden="true">
                  <span className="landing-demo-player landing-demo-player--one">6</span>
                  <span className="landing-demo-player landing-demo-player--two">8</span>
                  <span className="landing-demo-player landing-demo-player--three">9</span>
                  <span className="landing-demo-player landing-demo-player--four">11</span>
                  <svg viewBox="0 0 100 48" preserveAspectRatio="none"><path d="M26 27 C40 26 45 17 55 20 S72 30 84 12" /></svg>
                </div>
              </div>
              <article className="landing-step card">
                <svg className="landing-step__visual" viewBox="0 0 120 48" aria-hidden="true">
                  <rect x="1" y="1" width="118" height="46" rx="5" />
                  <circle cx="15" cy="15" r="5" /><path d="M27 15h42M27 32h66M15 32h1" />
                  <circle cx="15" cy="32" r="5" />
                </svg>
                <span className="step-index">01</span>
                <h3>Elige un plantel</h3>
                <p>Usa un plantel disponible de un club o selección, o arma un equipo a tu manera.</p>
              </article>
              <article className="landing-step card">
                <svg className="landing-step__visual landing-step__visual--movement" viewBox="0 0 120 48" aria-hidden="true">
                  <rect x="1" y="1" width="118" height="46" rx="5" />
                  <circle cx="23" cy="31" r="5" /><circle cx="57" cy="23" r="5" /><circle cx="91" cy="13" r="5" />
                  <path d="M28 30c12 0 15-8 24-8m10 0c12 0 17-9 24-9" />
                </svg>
                <span className="step-index">02</span>
                <h3>Mueve jugadores en la pizarra</h3>
                <p>Parte de una formación y mueve cada jugador con libertad por la cancha.</p>
              </article>
              <article className="landing-step card">
                <svg className="landing-step__visual landing-step__visual--saved" viewBox="0 0 120 48" aria-hidden="true">
                  <rect x="1" y="1" width="118" height="46" rx="5" />
                  <path d="M14 15h50M14 24h38M14 33h31" />
                  <circle cx="92" cy="24" r="12" /><path d="m87 24 4 4 7-8" />
                </svg>
                <span className="step-index">03</span>
                <h3>Guarda tu pizarra</h3>
                <p>Conserva la formación y las posiciones para volver a trabajar la idea más tarde.</p>
              </article>
            </div>
          </div>
        </section>
        <section className="landing-statement" data-moment="word-highlight">
          <div className="wrap">
            <p className="mo-wh__text">La pizarra conserva <strong>nombres, dorsales y posiciones</strong> mientras organizas cada jugada con tu equipo.</p>
          </div>
        </section>

        <section className="landing-teams" id="equipos">
          <div className="wrap">
            <div className="landing-teams__copy">
              <p className="section-kicker">Tu pizarra, tu equipo</p>
              <h2>Elige el plantel para tu pizarra.</h2>
              <p>Los planteles reales aparecen cuando el proveedor tiene datos disponibles. También puedes crear un equipo personalizado con tus titulares, dorsales y suplentes.</p>
              <Link className="button-primary button-primary--light landing-team-action" to={user ? "/app/boards/new" : "/register"}>
                Crear mi pizarra <span aria-hidden="true">↗</span>
              </Link>
            </div>
            <div className="team-choices" aria-label="Formas de preparar un equipo">
              <div className="team-choice team-choice--real">
                <div className="team-choice__glyph" aria-hidden="true"><span>R</span><span>11</span></div>
                <div><h3>Plantel real</h3><p>Busca un club o una selección y carga los jugadores disponibles.</p></div>
              </div>
              <div className="team-choice team-choice--custom">
                <div className="team-choice__glyph" aria-hidden="true"><span>+</span><span>XI</span></div>
                <div><h3>Crea un equipo personalizado</h3><p>Define el nombre, color, titulares y banco.</p></div>
              </div>
            </div>
            <div className="landing-team-preview" role="img" aria-label="Posiciones disponibles en una alineación">
              <p className="landing-team-preview__title">Posiciones de la alineación</p>
              <div className="landing-team-preview__roles">
                <span>Portero</span><span>Defensas</span><span>Centrocampistas</span><span>Delanteros</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-closing">
        <div className="wrap">
          <section className="landing-final-cta">
            <div className="landing-final-cta__message">
              <p className="section-kicker">La pizarra está lista</p>
              <h2>Diseña la próxima jugada en tu pizarra.</h2>
              <svg className="landing-final-cta__pitch" viewBox="0 0 130 72" fill="none" role="img" aria-label="Diagrama de una jugada en la cancha">
                <rect x="1" y="1" width="128" height="70" rx="5" />
                <path d="M65 1v70M65 25a11 11 0 1 0 0 22 11 11 0 0 0 0-22ZM1 18h21v36H1m128-36h-21v36h21" />
                <circle cx="41" cy="22" r="4" /><circle cx="70" cy="38" r="4" /><circle cx="93" cy="25" r="4" />
                <path d="m70 38 22-12" strokeDasharray="3 3" />
              </svg>
            </div>
            <Link className="button-primary button-primary--light" to={user ? "/app" : "/register"}>
              Crear mi pizarra <span aria-hidden="true">↗</span>
            </Link>
          </section>
          <div className="public-footer">
            <Brand />
            <span>Una idea clara también cambia el partido.</span>
            <Link to="/login">Iniciar sesión</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
