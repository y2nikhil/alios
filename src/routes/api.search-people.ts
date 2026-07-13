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
          const { q } = await request.json();
          const term = typeof q === "string" ? q.trim().slice(0, 80) : "";
          if (!term) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: cors });

          const auth = request.headers.get("authorization");
          if (!auth) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: cors });

          const userClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
            global: { headers: { Authorization: auth } },
          });
          const { data: { user } } = await userClient.auth.getUser();
          if (!user) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: cors });

          // is requester admin?
          const { data: rolesRows } = await userClient
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);
          const roles = (rolesRows ?? []).map((r: any) => r.role);
          const isAdmin = roles.includes("admin") || roles.includes("super_admin");

          // Admin path: use service role to search across all profiles and emails.
          const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
            auth: { persistSession: false, autoRefreshToken: false },
          });

          const client = isAdmin ? admin : userClient;
          const pattern = `%${term}%`;
          const { data: profs } = await client
            .from("profiles")
            .select("id, username, display_name, avatar_url, avatar_icon, avatar_gradient")
            .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
            .limit(8);

          let profiles = (profs ?? []) as any[];

          // For admin, also search by email
          if (isAdmin && term.includes("@") === false ? false : isAdmin) {
            try {
              const { data: users } = await (admin as any).auth.admin.listUsers({ page: 1, perPage: 50 });
              const matched = (users?.users ?? []).filter((u: any) =>
                (u.email ?? "").toLowerCase().includes(term.toLowerCase()),
              );
              const ids = matched.map((u: any) => u.id);
              if (ids.length) {
                const { data: extra } = await admin
                  .from("profiles")
                  .select("id, username, display_name, avatar_url")
                  .in("id", ids);
                const have = new Set(profiles.map((p) => p.id));
                for (const p of (extra ?? []) as any[]) if (!have.has(p.id)) profiles.push(p);
              }
            } catch { /* ignore */ }
          }

          if (profiles.length === 0) return new Response(JSON.stringify({ results: [] }), { status: 200, headers: cors });

          const ids = profiles.map((p) => p.id);

          // Emails for admin
          let emailMap = new Map<string, string>();
          if (isAdmin) {
            try {
              const { data: users } = await (admin as any).auth.admin.listUsers({ page: 1, perPage: 200 });
              for (const u of (users?.users ?? [])) {
                if (ids.includes(u.id)) emailMap.set(u.id, u.email ?? "");
              }
            } catch { /* ignore */ }
          }

          // Active aux session -> status name
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

          const results = profiles.map((p) => ({
            id: p.id,
            username: p.username,
            display_name: p.display_name,
            avatar_url: p.avatar_url,
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
