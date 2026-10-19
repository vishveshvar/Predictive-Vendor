import React from 'react';
import { Inbox } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'There is currently no data available for this view or filter criteria.',
  icon: Icon = Inbox,
  actionText = null,
  onAction = null,
}) {
  return (
    <div className="glass-panel p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
      <div className="p-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 mb-3.5">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
