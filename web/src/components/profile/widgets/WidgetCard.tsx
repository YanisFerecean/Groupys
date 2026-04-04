import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  className?: string;
  style?: React.CSSProperties;
  textColor?: string;
  children: React.ReactNode;
}

export default function WidgetCard({
  title,
  className,
  style,
  textColor,
  children,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface-container-low p-6",
        className,
      )}
      style={{ ...style, ...(textColor ? { color: textColor } : {}) }}
    >
      <h3
        className="text-xs font-bold uppercase tracking-widest opacity-50 mb-4"
        style={!textColor ? { color: "var(--color-on-surface-variant)" } : undefined}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}
