import React from 'react';

export function Skeleton({ className = '', variant, height, children, ...props }) {
  if (variant === 'card') {
    return (
      <div
        style={height ? { height } : undefined}
        className={`glass-panel p-5 space-y-3 animate-pulse bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 ${className}`}
      >
        <div className="flex justify-between items-center">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="h-7 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div
        style={height ? { height } : undefined}
        className={`glass-panel p-5 flex flex-col justify-between animate-pulse bg-slate-100 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 ${
          height ? '' : 'h-72'
        } ${className}`}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
        <div className="space-y-3 flex-1 flex flex-col justify-center">
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3 w-5/6 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-3 w-4/6 bg-slate-200 dark:bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      style={height ? { height } : undefined}
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-md ${className}`}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return <Skeleton variant="card" />;
}

export function ChartSkeleton({ height = 'h-72' }) {
  return <Skeleton variant="chart" className={height} />;
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="glass-panel p-5 space-y-3">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default Skeleton;
