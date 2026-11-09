import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { Brand } from "../ui/Brand";

export function PrivateNav() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="private-nav">
      <Brand />
      <nav className="private-nav__links" aria-label="Espacio de trabajo">
        <NavLink className={({ isActive }) => isActive ? "is-current" : undefined} end to="/app">Pizarras</NavLink>
        <NavLink className={({ isActive }) => isActive ? "is-current" : undefined} to="/app/teams">Equipos</NavLink>
      </nav>
      <div className="private-nav__account">
        <span className="private-nav__user">{user?.displayName ?? user?.email}</span>
        <button className="quiet-button" disabled={signingOut} onClick={handleSignOut} type="button">
          {signingOut ? "Saliendo…" : "Cerrar sesión"}
        </button>
        <Link className="private-nav__mobile-home" to="/">Inicio</Link>
      </div>
    </header>
  );
}
