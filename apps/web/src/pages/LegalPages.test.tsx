import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../auth/AuthProvider";
import { App } from "../ui/App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const publicLegalRoutes = [
  { path: "/privacy", heading: "Política de privacidad", siblingLink: "Condiciones de servicio" },
  { path: "/terms", heading: "Condiciones de servicio", siblingLink: "Privacidad" },
] as const;

test.each(publicLegalRoutes)("renders $path without requiring an account", async ({ path, heading, siblingLink }) => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const body = String(input) === "/api/auth/providers"
      ? { emailPassword: true, google: false }
      : { user: null };
    return {
      ok: true,
      json: async () => body,
    } as Response;
  }));

  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByRole("heading", { name: heading })).toBeTruthy();
  expect(screen.getByRole("link", { name: siblingLink }).getAttribute("href")).toBe(
    siblingLink === "Privacidad" ? "/privacy" : "/terms",
  );
  expect(screen.getByText("John Gomez Vega")).toBeTruthy();
  expect(screen.getByRole("link", { name: "zemogpassive99@gmail.com" }).getAttribute("href"))
    .toBe("mailto:zemogpassive99@gmail.com");
  expect(screen.getAllByText(/Colombia/).length).toBeGreaterThan(0);
});
