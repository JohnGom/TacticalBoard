import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../ui/Brand";
import { LegalLinks } from "./LegalPages";

type AccountMode = "login" | "register";

interface AccountPageProps {
  mode: AccountMode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function AccountPage({ mode }: AccountPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, googleEnabled, refresh } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    const oauthError = searchParams.get("error");
    if (oauthError === "google_cancelled") return "Se canceló el acceso con Google.";
    if (oauthError === "google_state") return "La validación de Google expiró. Inténtalo de nuevo.";
    if (oauthError === "google_failed") return "No se pudo verificar tu cuenta de Google.";
    if (oauthError === "google_unavailable") return "El acceso con Google aún no está configurado.";
    return null;
  });
  const isRegister = mode === "register";

  if (!loading && user) return <Navigate to="/app" replace />;

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(isRegister ? { displayName } : {}), email, password }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(isRecord(payload) && typeof payload.message === "string"
          ? payload.message
          : "No se pudo completar el acceso. Revisa los datos e inténtalo de nuevo.");
      }
      await refresh();
      navigate("/app", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="account-page">
      <header className="account-nav">
        <Brand />
        <Link to="/">Volver al inicio</Link>
      </header>
      <div className="account-layout">
        <aside className="account-aside">
          <div className="account-aside__pitch" aria-hidden="true">
            <span className="account-player account-player--a">6</span>
            <span className="account-player account-player--b">8</span>
            <span className="account-player account-player--c">9</span>
            <span className="account-arrow" />
          </div>
          <div className="account-aside__copy">
            <p className="section-kicker">Tu espacio de trabajo</p>
            <h1>Guarda la idea. Vuelve a ella cuando quieras.</h1>
            <p>Entra para crear pizarras y conservar tus equipos.</p>
          </div>
        </aside>

        <section className="account-form-panel" aria-labelledby="account-title">
          <p className="section-kicker">{isRegister ? "Crea tu cuenta" : "Qué bueno verte"}</p>
          <h2 id="account-title">{isRegister ? "Empieza tu espacio táctico" : "Inicia sesión"}</h2>
          <p className="account-form-panel__intro">
            {isRegister ? "Guarda tus planteles y tableros en un solo lugar." : "Continúa donde dejaste la última jugada."}
          </p>

          <form className="account-form" onSubmit={submitAccount}>
            {isRegister && (
              <label className="account-field">
                <span>Nombre</span>
                <input autoComplete="name" maxLength={120} onChange={(event) => setDisplayName(event.target.value)} required value={displayName} />
              </label>
            )}
            <label className="account-field">
              <span>Correo electrónico</span>
              <input autoComplete="email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
            </label>
            <label className="account-field">
              <span>Contraseña</span>
              <input autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 12 : 1} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
              {isRegister && <small>Usa al menos 12 caracteres.</small>}
            </label>
            {error && <p className="account-error" role="alert">{error}</p>}
            <button className="button-primary button-primary--dark account-submit" disabled={busy || loading} type="submit">
              {busy ? "Un momento…" : isRegister ? "Crear cuenta" : "Iniciar sesión"}
            </button>
          </form>

          <div className="account-divider"><span>o</span></div>
          <button className="google-button" disabled={!googleEnabled || busy} onClick={() => window.location.assign("/api/auth/google/start")} type="button">
            <span className="google-mark" aria-hidden="true">G</span>
            Continuar con Google
          </button>
          {!googleEnabled && <p className="google-note">Google se activa al añadir las credenciales OAuth del proyecto en el servidor.</p>}

          <p className="account-switch">
            {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes cuenta?"}{" "}
            <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Inicia sesión" : "Crea una cuenta"}</Link>
          </p>
          <p className="account-privacy">Tus pizarras son privadas y solo tú puedes acceder a ellas.</p>
          <p className="account-legal-intro">Consulta la información sobre el servicio y tus datos:</p>
          <LegalLinks className="account-legal-links" />
        </section>
      </div>
    </main>
  );
}
