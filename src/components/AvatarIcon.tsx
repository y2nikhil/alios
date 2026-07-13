import * as Icons from "lucide-react";

export const GRADIENTS: Record<string, string> = {
  violet: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
  sunset: "linear-gradient(135deg, #f97316, #ec4899)",
  ocean: "linear-gradient(135deg, #06b6d4, #3b82f6)",
  forest: "linear-gradient(135deg, #10b981, #84cc16)",
  mono: "linear-gradient(135deg, #64748b, #0f172a)",
  neon: "linear-gradient(135deg, #a855f7, #22c55e)",
  cherry: "linear-gradient(135deg, #ef4444, #f59e0b)",
  ice: "linear-gradient(135deg, #60a5fa, #c084fc)",
};

export const ACCENT_TOKENS: Record<string, string> = {
  violet: "#8b5cf6",
  sunset: "#ec4899",
  ocean: "#06b6d4",
  forest: "#10b981",
  mono: "#64748b",
  neon: "#22c55e",
  cherry: "#ef4444",
  ice: "#60a5fa",
};

export const ICON_CHOICES = [
  "Sparkles","Rocket","Flame","Zap","Heart","Star","Crown","Trophy","Skull",
  "Ghost","Coffee","Music","Gamepad2","Brain","Bolt","Sun","Moon","Cat",
  "Dog","Palette","Leaf","Feather","Diamond","Anchor",
];

export function AvatarIconRender({
  icon, gradient, className, initial,
}: { icon?: string | null; gradient?: string | null; className?: string; initial?: string | null }) {
  const grad = GRADIENTS[gradient ?? "violet"] ?? GRADIENTS.violet;
  const Icon = icon ? (Icons as any)[icon] : null;
  return (
    <div
      className={className}
      style={{ background: grad }}
    >
      {Icon ? <Icon className="h-1/2 w-1/2 text-white" strokeWidth={2.5} /> : (
        <span className="text-white font-bold" style={{ fontSize: "45%" }}>
          {(initial ?? "?").toUpperCase()}
        </span>
      )}
    </div>
  );
}
