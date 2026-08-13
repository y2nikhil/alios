import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MailX, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/unsubscribe")({
  head: () => ({
    meta: [
      { title: "Unsubscribe from ClassLab emails" },
      { name: "description", content: "Manage your ClassLab email preferences and unsubscribe from future emails." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Unsubscribe,
});

type State = "loading" | "ready" | "done" | "invalid" | "error";

function Unsubscribe() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    setToken(t);
    if (!t) { setState("invalid"); return; }
    fetch(`/email/unsubscribe?token=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) return setState("invalid");
        setState(j?.unsubscribed ? "done" : "ready");
      })
      .catch(() => setState("error"));
  }, []);

  const confirm = async () => {
    if (!token) return;
    setBusy(true);
    try {
      const r = await fetch("/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-16 bg-background">
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          {state === "done" ? <CheckCircle2 className="h-6 w-6" /> : <MailX className="h-6 w-6" />}
        </div>
        <h1 className="text-xl font-bold">
          {state === "done" ? "You're unsubscribed" : "Unsubscribe from ClassLab emails"}
        </h1>

        {state === "loading" && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your link…
          </p>
        )}
        {state === "ready" && (
          <>
            <p className="text-sm text-muted-foreground">
              You'll stop receiving app emails from ClassLab. Account and security emails still reach you.
            </p>
            <Button className="w-full" onClick={confirm} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm unsubscribe
            </Button>
          </>
        )}
        {state === "done" && (
          <p className="text-sm text-muted-foreground">
            This address has been removed from ClassLab app emails.
          </p>
        )}
        {state === "invalid" && (
          <p className="text-sm text-muted-foreground">
            This unsubscribe link is invalid or has expired.
          </p>
        )}
        {state === "error" && (
          <p className="text-sm text-muted-foreground">
            Something went wrong. Please try the link again in a moment.
          </p>
        )}

        <a href="/" className="inline-block text-sm text-primary underline underline-offset-4">
          Back to ClassLab
        </a>
      </Card>
    </main>
  );
}
