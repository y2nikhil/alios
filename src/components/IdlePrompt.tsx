import { useEffect, useRef, useState } from "react";
import { useAux } from "@/lib/aux-store";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const IDLE_MS = 30 * 60 * 1000; // 30 minutes
const RESPONSE_WINDOW_MS = 60 * 1000; // 1 minute to respond

function beep() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = 660;
    gain.gain.value = 0.001;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.stop(ctx.currentTime + 0.7);
    setTimeout(() => ctx.close(), 800);
  } catch { /* ignore */ }
}

export function IdlePrompt() {
  const { activeSession, endActiveSession } = useAux();
  const [prompting, setPrompting] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const lastActivity = useRef(Date.now());

  // Track activity
  useEffect(() => {
    const bump = () => { lastActivity.current = Date.now(); };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => { events.forEach((e) => window.removeEventListener(e, bump)); };
  }, []);

  // Idle detector
  useEffect(() => {
    if (!activeSession) return;
    const check = setInterval(() => {
      if (prompting) return;
      if (Date.now() - lastActivity.current >= IDLE_MS) {
        setPrompting(true);
        setCountdown(60);
        beep();
      }
    }, 15_000);
    return () => clearInterval(check);
  }, [activeSession, prompting]);

  // Countdown while prompting
  useEffect(() => {
    if (!prompting) return;
    const started = Date.now();
    const idleSince = lastActivity.current;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((RESPONSE_WINDOW_MS - (Date.now() - started)) / 1000));
      setCountdown(left);
      if (left === 30 || left === 10) beep();
      if (left <= 0) {
        clearInterval(tick);
        setPrompting(false);
        // Stop the timer at the moment activity stopped — idle time is not counted.
        void endActiveSession(idleSince);
        toast.warning("No response — your timer was stopped (idle time not counted)");
      }
    }, 250);
    return () => clearInterval(tick);
  }, [prompting, endActiveSession]);

  const stillWorking = () => {
    lastActivity.current = Date.now();
    setPrompting(false);
    toast.success("Welcome back — still on the clock");
  };

  const punchOut = async () => {
    const idleSince = lastActivity.current;
    setPrompting(false);
    await endActiveSession(idleSince);
  };

  const pct = Math.max(0, Math.min(100, (countdown / (RESPONSE_WINDOW_MS / 1000)) * 100));

  return (
    <AlertDialog open={prompting} onOpenChange={(o) => { if (!o) stillWorking(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Still working? 👀</AlertDialogTitle>
          <AlertDialogDescription>
            No activity for 30 minutes. Your timer will stop automatically in{" "}
            <strong className="text-primary tabular-nums">{countdown}s</strong> — the idle time won't be counted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={punchOut}>Stop my timer</AlertDialogCancel>
          <AlertDialogAction onClick={stillWorking}>Yes, still working</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

