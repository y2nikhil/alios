import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
};

/** Small "i" button that explains a feature to new users. */
export function HelpTip({ title, children, className, align = "start" }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`What is ${title}?`}
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground",
            className,
          )}
        >
          <Info className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-72 text-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">{title}</p>
        <div className="text-muted-foreground leading-relaxed [&_strong]:text-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  );
}
