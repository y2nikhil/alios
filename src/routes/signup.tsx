import { createFileRoute, redirect } from "@tanstack/react-router";

/** Signup lives on /login now — one page for both sign in and account creation. */
export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    throw redirect({ to: "/login", search: { mode: "signup" } });
  },
  component: () => null,
});
