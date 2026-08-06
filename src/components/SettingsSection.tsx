import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Collapsible settings section — keeps the settings page short by letting
 * people jump straight to the block they care about.
 */
export function SettingsSection({
  title,
  description,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 transition"
      >
        {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm">{title}</h3>
          {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="px-1 pb-1 sm:px-2 sm:pb-2 [&>*]:!bg-transparent [&>*]:!border-0 [&>*]:!shadow-none [&>*]:!backdrop-blur-none">
          {children}
        </div>
      )}
    </div>
  );
}
