interface Props { className?: string; }
export function Skeleton({ className = '' }: Props) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="bg-bg-card rounded-card p-4 space-y-3">
      <Skeleton className="w-full h-40" />
      <Skeleton className="w-3/4 h-4" />
      <Skeleton className="w-full h-3" />
      <Skeleton className="w-full h-3" />
    </div>
  );
}
