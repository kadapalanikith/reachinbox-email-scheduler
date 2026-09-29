import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return (
    <div className="fixed bottom-5 right-5 z-[100] animate-scale-up">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium min-w-[280px] max-w-sm ${
          type === 'success'
            ? 'bg-white border-emerald-200 text-slate-800'
            : 'bg-white border-red-200 text-slate-800'
        }`}
      >
        {type === 'success' ? (
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
        ) : (
          <XCircle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
        )}
        <span className="flex-1 leading-snug">{message}</span>
        <button
          onClick={onClose}
          className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
