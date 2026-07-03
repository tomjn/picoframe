import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { NavGate } from "./NavGate";

afterEach(cleanup);

function renderAt(path: string, use: () => boolean, redirectTo?: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>home-page</div>} />
        <Route
          path="/secret"
          element={
            <NavGate use={use} redirectTo={redirectTo}>
              <div>secret-page</div>
            </NavGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

test("renders children when the predicate is true", () => {
  renderAt("/secret", () => true);
  expect(screen.getByText("secret-page")).toBeTruthy();
});

test("redirects to / by default when the predicate is false", () => {
  renderAt("/secret", () => false);
  expect(screen.queryByText("secret-page")).toBeNull();
  expect(screen.getByText("home-page")).toBeTruthy();
});

test("redirects to a custom path when provided", () => {
  render(
    <MemoryRouter initialEntries={["/secret"]}>
      <Routes>
        <Route path="/landing" element={<div>landing-page</div>} />
        <Route
          path="/secret"
          element={
            <NavGate use={() => false} redirectTo="/landing">
              <div>secret-page</div>
            </NavGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("landing-page")).toBeTruthy();
  expect(screen.queryByText("secret-page")).toBeNull();
});
