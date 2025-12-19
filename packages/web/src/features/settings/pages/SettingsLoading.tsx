import { Skeleton } from "@shared/components/ui/skeleton";

/**
 * Full page skeleton with tabs - for page-level loading
 */
export function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6 h-full">
      <div className="grid w-full grid-cols-3 gap-1 h-10 bg-muted rounded-lg p-1">
        <Skeleton className="h-full rounded-md" />
        <Skeleton className="h-full rounded-md" />
        <Skeleton className="h-full rounded-md" />
      </div>

      <div className="rounded-lg border bg-card max-w-7xl">
        <div className="p-6 space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="p-6 pt-0 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-5 w-24" />
            <div className="space-y-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full max-w-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full max-w-md" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full max-w-md" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              <div className="flex items-center justify-between max-w-md">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
              <div className="flex items-center justify-between max-w-md">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Form content skeleton - for loading within a card/tab
 */
export function ConfigFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full max-w-md" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between max-w-md">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <div className="flex items-center justify-between max-w-md">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
          <div className="flex items-center justify-between max-w-md">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-11 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
