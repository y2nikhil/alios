import { Outlet, Link, createRootRoute, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { Toaster } from "@/components/ui/sonner";
import { GA_MEASUREMENT_ID, trackPageView } from "@/lib/analytics";

import appCss from "../styles.css?url";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
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
      { name: "viewport", content: "width=device-width, initial-scale=1, interactive-widget=resizes-content" },
      { name: "theme-color", content: "#0C0C0D" },
      { title: "ClassLab — The Digital Campus for Every Student" },
      {
        name: "description",
        content: "Communities, events, notes, marketplace, internships and colleges — the digital campus built for Indian students.",
      },
      { property: "og:title", content: "ClassLab — The Digital Campus for Every Student" },
      { property: "og:description", content: "Join 50,000+ students across 500+ Indian colleges. Communities, notes, events, internships and more — all inside ClassLab." },
      { property: "og:type", content: "website" },
      { name: "google-site-verification", content: "26TVRoFjCOD6olJNi9OyxJoI1xeXY0nJsOsUcLAKA9o" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ClassLab — The Digital Campus for Every Student" },
      { name: "twitter:description", content: "The digital campus for every Indian student — communities, notes, events, internships and more." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Warm the API connection before the first query fires.
      ...(import.meta.env["VITE_SUPABASE_URL"]
        ? [{ rel: "preconnect", href: import.meta.env["VITE_SUPABASE_URL"] as string, crossOrigin: "anonymous" as const }]
        : []),
      { rel: "dns-prefetch", href: "https://www.googletagmanager.com" },
      // Non-blocking font load: fetched as print stylesheet, swapped to all by inline script.
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
        media: "print",
        // @ts-expect-error data attribute passthrough
        "data-lazy-font": "1",
      },

    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        {/* Google tag (gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');localStorage.setItem('alios-theme','dark');}catch(e){}})();`,
          }}
        />
      </head>

      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return (
    <AuthProvider>
      <ThemeProvider>
        <Outlet />
        <Toaster position="top-right" />
      </ThemeProvider>
    </AuthProvider>
  );
}

