interface SectionHeaderProps {
  title: string;
  actionText?: string;
  onAction?: () => void;
}

export default function SectionHeader({
  title,
  actionText,
  onAction,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      {actionText && (
        <button
          onClick={onAction}
          className="text-primary text-sm font-bold hover:opacity-80 transition-opacity"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
