import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthProvidersResponse, AuthSessionResponse, AuthUser } from "@tactical-board/contracts";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  googleEnabled: boolean;
  refresh: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAuthUser(value: unknown): value is AuthUser {
  return isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.displayName === "string" &&
    typeof value.createdAt === "string";
}

async function readCurrentUser(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", { credentials: "same-origin" });
  if (!response.ok) throw new Error("No se pudo comprobar la sesión.");
  const payload: unknown = await response.json();
  if (!isRecord(payload) || (payload.user !== null && !isAuthUser(payload.user))) {
    throw new Error("La API devolvió una sesión no válida.");
  }
  return payload.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const refresh = useCallback(async () => {
    const currentUser = await readCurrentUser();
    setUser(currentUser);
    return currentUser;
  }, []);

  useEffect(() => {
    let active = true;
    const sessionRequest = fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session endpoint unavailable");
        const payload: unknown = await response.json();
        if (!isRecord(payload) || (payload.user !== null && !isAuthUser(payload.user))) return null;
        return payload.user;
      })
      .catch(() => null);
    const providersRequest = fetch("/api/auth/providers")
      .then(async (response) => response.ok ? await response.json() as unknown : null)
      .catch(() => null);

    Promise.all([sessionRequest, providersRequest]).then(([sessionUser, providers]) => {
      if (!active) return;
      setUser(sessionUser);
      if (isRecord(providers)) {
        const authProviders = providers as Partial<AuthProvidersResponse>;
        setGoogleEnabled(authProviders.google === true);
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, googleEnabled, refresh, signOut }),
    [user, loading, googleEnabled, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
