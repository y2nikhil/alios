import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/search-people")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }),
      POST: async ({ request }) => {
        const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
        try {
          const body = await request.json().catch(() => ({}));
          const raw = typeof body?.q === "string" ? body.q.trim().slice(0, 80) : "";
          // Strip a leading @ so "@nikhil" matches usernames
          const term = raw.replace(/^@+/, "").trim();
          const listAll = raw === "@" || raw === "";

          const auth = request.headers.get("authorization");
          if (!auth) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: cors });

          const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
            global: { headers: { Authorization: auth } },
          });
          const { data: { user } } = await userClient.auth.getUser();
          if (!user) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: cors });

          if (!term && !listAll) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: cors });

          const { data: rolesRows } = await userClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          const roles = (rolesRows ?? []).map((r: any) => r.role);
          const isAdmin = roles.includes("admin") || roles.includes("super_admin");

          const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          // Search profiles visible under RLS (public + friends + self) via user client,
          // widened by admin lookups (email, non-public profiles) for admin.
          const pattern = `%${term}%`;
          let profiles: any[] = [];
          if (listAll) {
            const { data } = await userClient
              .from("profiles")
              .select("id, username, display_name, avatar_url, avatar_icon, avatar_gradient")
              .order("updated_at", { ascending: false })
              .limit(10);
            profiles = data ?? [];
          } else {
            const { data } = await (isAdmin ? admin : userClient)
              .from("profiles")
              .select("id, username, display_name, avatar_url, avatar_icon, avatar_gradient")
              .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
              .limit(10);
            profiles = data ?? [];
          }

          // Email lookup — everyone can find a user by (part of) their email.
          // Uses service role, but we only expose emails of the caller or of admins.
          if (term && term.length >= 2) {
            try {
              const { data: users } = await (admin as any).auth.admin.listUsers({ page: 1, perPage: 200 });
              const matched = (users?.users ?? []).filter((u: any) =>
                (u.email ?? "").toLowerCase().includes(term.toLowerCase()),
              );
              const ids = matched.map((u: any) => u.id);
              if (ids.length) {
                const { data: extra } = await admin
                  .from("profiles")
                  .select("id, username, display_name, avatar_url, avatar_icon, avatar_gradient")
                  .in("id", ids);
                const have = new Set(profiles.map((p) => p.id));
                for (const p of (extra ?? []) as any[]) if (!have.has(p.id)) profiles.push(p);
              }
            } catch { /* ignore */ }
          }

          if (profiles.length === 0) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: cors });

          const ids = profiles.map((p) => p.id);

          // Emails: fetch all, but only reveal them to admin or for the caller themselves.
          const emailMap = new Map<string, string>();
          try {
            const { data: users } = await (admin as any).auth.admin.listUsers({ page: 1, perPage: 200 });
            for (const u of (users?.users ?? [])) {
              if (!ids.includes(u.id)) continue;
              if (isAdmin || u.id === user.id) emailMap.set(u.id, u.email ?? "");
            }
          } catch { /* ignore */ }

          const { data: sessions } = await admin
            .from("aux_sessions")
            .select("user_id, status_id, started_at, aux_statuses(name, color)")
            .in("user_id", ids)
            .is("ended_at", null);

          const statusMap = new Map<string, { name: string; color: string; since: string }>();
          for (const s of (sessions ?? []) as any[]) {
            statusMap.set(s.user_id, {
              name: s.aux_statuses?.name ?? "Active",
              color: s.aux_statuses?.color ?? "#10b981",
              since: s.started_at,
            });
          }

          const results = profiles.slice(0, 12).map((p) => ({
            id: p.id,
            username: p.username,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
            avatar_icon: p.avatar_icon ?? null,
            avatar_gradient: p.avatar_gradient ?? null,
            email: emailMap.get(p.id) ?? null,
            status: statusMap.get(p.id) ?? null,
          }));

          return new Response(JSON.stringify({ results, isAdmin }), { status: 200, headers: cors });
        } catch (e: any) {
          return new Response(JSON.stringify({ results: [], error: String(e?.message ?? e) }), { status: 200, headers: cors });
        }
      },
    },
  },
});
