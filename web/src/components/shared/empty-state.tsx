/// Centered empty state message for when no data is available
interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-sm text-[#888780]">{message}</p>
    </div>
  );
}
