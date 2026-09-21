const pulse = 'animate-pulse bg-gray-200 dark:bg-gray-800 rounded-xl';

function HeaderSkeleton({ titleWidth = 'w-48' }) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className={`h-8 ${pulse} ${titleWidth} mb-2`} />
      <div className={`h-4 ${pulse} w-2/3 max-w-md`} />
    </div>
  );
}

export function ListItemsSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={`h-20 ${pulse}`} />
      ))}
    </div>
  );
}

export function PageSkeleton({ variant = 'generic' }) {
  return (
    <div
      className="min-h-screen bg-white dark:bg-black p-4 sm:p-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto">
        <span className="sr-only">Loading</span>
        <HeaderSkeleton />
        {variant === 'dashboard' ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className={`h-24 ${pulse}`} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`h-64 ${pulse}`} />
              <div className={`h-64 ${pulse}`} />
            </div>
          </>
        ) : null}
        {variant === 'list' ? (
          <>
            <div className={`h-24 ${pulse} mb-6`} />
            <ListItemsSkeleton count={5} />
          </>
        ) : null}
        {variant === 'calendar' ? (
          <>
            <div className={`h-16 ${pulse} mb-6`} />
            <div className={`h-80 ${pulse} mb-6`} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className={`h-24 ${pulse}`} />
              ))}
            </div>
          </>
        ) : null}
        {variant === 'analytics' ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className={`h-24 ${pulse}`} />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`h-64 ${pulse}`} />
              <div className={`h-64 ${pulse}`} />
            </div>
          </>
        ) : null}
        {variant === 'documents' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className={`h-40 ${pulse}`} />
            ))}
          </div>
        ) : null}
        {variant === 'reports' ? (
          <>
            <div className={`h-24 ${pulse} mb-6`} />
            <div className={`h-96 ${pulse}`} />
          </>
        ) : null}
        {variant === 'generic' ? (
          <>
            <div className={`h-24 ${pulse} mb-6`} />
            <div className={`h-64 ${pulse}`} />
          </>
        ) : null}
      </div>
    </div>
  );
}
