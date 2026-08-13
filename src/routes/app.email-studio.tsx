import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Mail, Send, Save, Trash2, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/email/send";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/email-studio")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/login" });
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", session.user.id);
    if (!roles?.some((r) => r.role === "super_admin" || r.role === "admin")) {
      throw redirect({ to: "/app" });
    }
  },
  head: () => ({
    meta: [
      { title: "Email Studio — Compose branded ClassLab emails" },
      { name: "description", content: "Write, preview and send branded ClassLab emails without touching code." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: EmailStudio,
});

type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "quote"; text: string }
  | { type: "bullet"; text: string }
  | { type: "divider" };

function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  for (const rawLine of src.split(/\n{1,}/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (/^---+$/.test(line)) out.push({ type: "divider" });
    else if (line.startsWith("## ")) out.push({ type: "h", text: line.slice(3).trim() });
    else if (line.startsWith("> ")) out.push({ type: "quote", text: line.slice(2).trim() });
    else if (/^[-*]\s+/.test(line)) out.push({ type: "bullet", text: line.replace(/^[-*]\s+/, "") });
    else out.push({ type: "p", text: line });
  }
  return out;
}

type Draft = {
  id: string; name: string; subject: string; heading: string; intro: string;
  content: string; ctaLabel: string; ctaUrl: string; signoff: string; footerNote: string;
};

const DRAFT_KEY = "classlab.email-drafts";
const SAMPLE = `We're opening three community intern seats at ClassLab this month.

## What you'd do
- Host focus rooms and watch parties
- Moderate exam communities
- Help students build study plans

> Two hours a day, fully remote, certificate on completion.

Reply to this email with a short note about your exam prep journey.`;

function EmailStudio() {
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("We're hiring ClassLab interns");
  const [heading, setHeading] = useState("We're hiring interns");
  const [intro, setIntro] = useState("");
  const [content, setContent] = useState(SAMPLE);
  const [ctaLabel, setCtaLabel] = useState("Apply now");
  const [ctaUrl, setCtaUrl] = useState("https://classlab.in");
  const [signoff, setSignoff] = useState("— Team ClassLab");
  const [footerNote, setFooterNote] = useState("");
  const [sending, setSending] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    try { setDrafts(JSON.parse(localStorage.getItem(DRAFT_KEY) || "[]")); } catch { /* noop */ }
  }, []);

  const persist = (next: Draft[]) => {
    setDrafts(next);
    localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  };

  const blocks = useMemo(() => parseBlocks(content), [content]);

  const saveDraft = () => {
    const name = subject || heading || "Untitled";
    const draft: Draft = {
      id: crypto.randomUUID(), name, subject, heading, intro, content,
      ctaLabel, ctaUrl, signoff, footerNote,
    };
    persist([draft, ...drafts].slice(0, 30));
    toast.success("Draft saved");
  };

  const loadDraft = (d: Draft) => {
    setSubject(d.subject); setHeading(d.heading); setIntro(d.intro);
    setContent(d.content); setCtaLabel(d.ctaLabel); setCtaUrl(d.ctaUrl);
    setSignoff(d.signoff); setFooterNote(d.footerNote);
    toast.success("Draft loaded");
  };

  const send = async () => {
    const to = recipient.trim();
    if (!to || !/^\S+@\S+\.\S+$/.test(to)) return toast.error("Enter a valid recipient email");
    if (!subject.trim()) return toast.error("Add a subject line");
    setSending(true);
    try {
      await sendTransactionalEmail({
        templateName: "broadcast",
        recipientEmail: to,
        idempotencyKey: `broadcast-${crypto.randomUUID()}`,
        templateData: {
          subject, heading, intro,
          blocks, ctaLabel, ctaUrl, signoff,
          previewText: intro || heading,
          footerNote,
        },
      });
      toast.success(`Email queued for ${to}`);
      setRecipient("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send email");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" /> Email Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Write it here, see it live, send it branded — no code needed.
          </p>
        </div>
        <Badge variant="outline">from noreply@info.classlab.in</Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Composer */}
        <Card className="p-4 space-y-4">
          <Tabs defaultValue="write">
            <TabsList>
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="to">Send to</Label>
                <Input id="to" placeholder="person@example.com" value={recipient}
                  onChange={(e) => setRecipient(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject line</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="heading">Headline</Label>
                <Input id="heading" value={heading} onChange={(e) => setHeading(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="intro">Intro line (also the inbox preview text)</Label>
                <Input id="intro" value={intro} placeholder="One warm opening sentence"
                  onChange={(e) => setIntro(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Body</Label>
                <Textarea id="content" rows={12} value={content}
                  onChange={(e) => setContent(e.target.value)} className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">
                  Formatting: <code>## </code> section title · <code>- </code> bullet ·
                  <code> &gt; </code> highlight · <code>---</code> divider · blank line = new paragraph.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="ctaLabel">Button text</Label>
                  <Input id="ctaLabel" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ctaUrl">Button link</Label>
                  <Input id="ctaUrl" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="signoff">Sign-off</Label>
                  <Input id="signoff" value={signoff} onChange={(e) => setSignoff(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="footerNote">Footer note (optional)</Label>
                  <Input id="footerNote" value={footerNote} onChange={(e) => setFooterNote(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button onClick={send} disabled={sending}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send email
                </Button>
                <Button variant="outline" onClick={saveDraft}>
                  <Save className="h-4 w-4" /> Save draft
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Emails go out one recipient at a time. For large newsletters to a subscriber
                list, use a dedicated bulk-email service — it protects your domain reputation.
              </p>
            </TabsContent>

            <TabsContent value="drafts" className="space-y-2 pt-4">
              {drafts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No saved drafts yet.</p>
              ) : drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                  <span className="truncate text-sm">{d.name}</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => loadDraft(d)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => persist(drafts.filter((x) => x.id !== d.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </Card>

        {/* Live preview */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Live preview</p>
          <EmailPreview
            subject={subject} heading={heading} intro={intro} blocks={blocks}
            ctaLabel={ctaLabel} ctaUrl={ctaUrl} signoff={signoff} footerNote={footerNote}
          />
        </div>
      </div>
    </div>
  );
}

function EmailPreview(props: {
  subject: string; heading: string; intro: string; blocks: Block[];
  ctaLabel: string; ctaUrl: string; signoff: string; footerNote: string;
}) {
  const gold = "#C9A227";
  return (
    <div style={{ background: "#f6f5f1", borderRadius: 16, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#8a8d96", marginBottom: 10 }}>
        <strong style={{ color: "#3f4149" }}>ClassLab</strong> &lt;noreply@info.classlab.in&gt; · {props.subject || "(no subject)"}
      </div>
      <div style={{ background: "#fff", border: "1px solid #e8e6df", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ background: "#14140f", padding: "18px 22px" }}>
          <div style={{ color: "#fff", fontWeight: 700, fontSize: 18 }}>
            Class<span style={{ color: gold }}>Lab</span>
          </div>
          <div style={{ color: "#9a9891", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>
            Study together. Stay accountable.
          </div>
        </div>
        <div style={{ borderTop: `3px solid ${gold}` }} />
        <div style={{ padding: "26px 22px", fontFamily: "Helvetica, Arial, sans-serif" }}>
          <h2 style={{ fontSize: 22, color: "#14140f", margin: "0 0 12px", fontWeight: 700 }}>
            {props.heading || "Headline"}
          </h2>
          {props.intro ? <p style={pStyle}>{props.intro}</p> : null}
          {props.blocks.map((b, i) => {
            if (b.type === "divider") return <hr key={i} style={{ border: 0, borderTop: "1px solid #e8e6df", margin: "22px 0" }} />;
            if (b.type === "h") return <p key={i} style={{ fontSize: 16, fontWeight: 700, color: "#14140f", margin: "22px 0 6px" }}>{b.text}</p>;
            if (b.type === "quote") return <p key={i} style={{ borderLeft: `3px solid ${gold}`, paddingLeft: 12, fontStyle: "italic", color: "#14140f", margin: "0 0 14px", fontSize: 14, lineHeight: 1.65 }}>{b.text}</p>;
            if (b.type === "bullet") return <p key={i} style={{ ...pStyle, margin: "0 0 6px" }}>•&nbsp;&nbsp;{b.text}</p>;
            return <p key={i} style={pStyle}>{b.text}</p>;
          })}
          {props.ctaLabel && props.ctaUrl ? (
            <div style={{ margin: "22px 0 4px" }}>
              <span style={{ background: gold, color: "#14140f", fontWeight: 700, fontSize: 14, borderRadius: 10, padding: "12px 22px", display: "inline-block" }}>
                {props.ctaLabel}
              </span>
            </div>
          ) : null}
          {props.signoff ? <p style={{ ...pStyle, marginTop: 22 }}>{props.signoff}</p> : null}
        </div>
      </div>
      <div style={{ textAlign: "center", fontSize: 11, color: "#8a8d96", padding: "14px 8px 2px" }}>
        {props.footerNote ? <div>{props.footerNote}</div> : null}
        <div>ClassLab — focus rooms, watch parties and exam prep communities.</div>
      </div>
    </div>
  );
}

const pStyle: React.CSSProperties = {
  fontSize: 14, lineHeight: 1.65, color: "#3f4149", margin: "0 0 14px",
};
