export function SkeletonBlock({ className }) {
  return <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <SkeletonBlock className="h-20 w-full" />
      <SkeletonBlock className="h-20 w-full" />
      <SkeletonBlock className="h-20 w-full" />
    </div>
  );
}
