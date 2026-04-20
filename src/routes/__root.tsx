import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ALIOS — A Workforce management app with real-time tracking" },
      {
        name: "description",
        content: "Personal workforce & productivity OS. Track status, analyze your day, capture ideas on infinite mind maps.",
      },
      { property: "og:title", content: "ALIOS — A Workforce management app with real-time tracking" },
      {
        property: "og:description",
        content: "Personal workforce & productivity OS. Track status, analyze your day, capture ideas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "ALIOS — A Workforce management app with real-time tracking" },
      { name: "description", content: "ALIOS is an AI-powered productivity and workforce management app with real-time tracking, analytics dashboards, and an interactive mind map builder to optimize" },
      { property: "og:description", content: "ALIOS is an AI-powered productivity and workforce management app with real-time tracking, analytics dashboards, and an interactive mind map builder to optimize" },
      { name: "twitter:description", content: "ALIOS is an AI-powered productivity and workforce management app with real-time tracking, analytics dashboards, and an interactive mind map builder to optimize" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/jGa5ivWz8YVLm9UZWOCCQhpgJW63/social-images/social-1776676111367-pfp.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/jGa5ivWz8YVLm9UZWOCCQhpgJW63/social-images/social-1776676111367-pfp.webp" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster position="top-right" theme="dark" />
    </AuthProvider>
  );
}
