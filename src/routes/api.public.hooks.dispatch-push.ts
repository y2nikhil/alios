import { createFileRoute } from "@tanstack/react-router";

/**
 * Dispatch a Web Push notification for a given notifications.id.
 * Called by a DB trigger via pg_net after AFTER INSERT on public.notifications.
 * Auth: shared secret in x-dispatch-secret header (PUSH_DISPATCH_SECRET).
 */
export const Route = createFileRoute("/api/public/hooks/dispatch-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PUSH_DISPATCH_SECRET;
        if (!secret) {
          return Response.json({ error: "not configured" }, { status: 500 });
        }
        if (request.headers.get("x-dispatch-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        let body: { notification_id?: string } = {};
        try { body = await request.json(); } catch { /* ignore */ }
        if (!body.notification_id) {
          return Response.json({ error: "missing notification_id" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: notif, error: nErr } = await supabaseAdmin
          .from("notifications")
          .select("id, user_id, type, title, body, link, metadata")
          .eq("id", body.notification_id)
          .maybeSingle();
        if (nErr || !notif) {
          return Response.json({ error: "notification not found" }, { status: 404 });
        }

        // Respect user preference for this category
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("notification_prefs")
          .eq("id", notif.user_id)
          .maybeSingle();
        const prefs = (profile?.notification_prefs ?? {}) as Record<string, unknown>;
        if (prefs.push_enabled === false) {
          return Response.json({ ok: true, skipped: "push_disabled" });
        }
        const categoryKey = notif.type as string;
        // Categories we specifically toggle; fall back to sending.
        const toggleableCategories = new Set([
          "focus_milestone",
          "task_completed",
          "moderation_alert",
          "chat_mention",
        ]);
        if (toggleableCategories.has(categoryKey) && prefs[categoryKey] === false) {
          return Response.json({ ok: true, skipped: `${categoryKey}_disabled` });
        }

        const { data: subs } = await supabaseAdmin
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", notif.user_id);

        if (!subs || subs.length === 0) {
          return Response.json({ ok: true, sent: 0 });
        }

        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const subject = process.env.VAPID_SUBJECT || "mailto:admin@alios.app";
        if (!publicKey || !privateKey) {
          return Response.json({ error: "vapid keys missing" }, { status: 500 });
        }

        // Dynamically import web-push inside the handler.
        let webpush: any;
        try {
          webpush = (await import("web-push")).default ?? (await import("web-push"));
        } catch (e) {
          return Response.json({ error: "web-push unavailable", detail: String(e) }, { status: 500 });
        }
        try {
          webpush.setVapidDetails(subject, publicKey, privateKey);
        } catch (e) {
          return Response.json({ error: "vapid setup failed", detail: String(e) }, { status: 500 });
        }

        const payload = JSON.stringify({
          title: notif.title,
          body: notif.body ?? "",
          link: notif.link ?? "/app/notifications",
          tag: notif.type,
          data: { notification_id: notif.id, type: notif.type },
        });

        let sent = 0;
        const stale: string[] = [];
        await Promise.all(
          subs.map(async (s: any) => {
            try {
              await webpush.sendNotification(
                { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
                payload,
                { TTL: 3600 },
              );
              sent++;
            } catch (err: any) {
              const code = err?.statusCode;
              if (code === 404 || code === 410) stale.push(s.endpoint);
            }
          }),
        );

        if (stale.length) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", stale);
        }

        return Response.json({ ok: true, sent, removed: stale.length });
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-dispatch-secret",
          },
        }),
    },
  },
});
