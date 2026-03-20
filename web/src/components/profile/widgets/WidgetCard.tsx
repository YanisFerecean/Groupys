import { cn } from "@/lib/utils";

interface WidgetCardProps {
  title: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export default function WidgetCard({
  title,
  className,
  style,
  children,
}: WidgetCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-surface-container-low p-6",
        className,
      )}
      style={style}
    >
      <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant opacity-50 mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}
