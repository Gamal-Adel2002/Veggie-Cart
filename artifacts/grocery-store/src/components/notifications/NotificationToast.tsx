import React, { useEffect, useRef, useState } from 'react';
import { X, Bell } from 'lucide-react';
import { NotificationItem } from '@/contexts/NotificationContext';
import { useLocation } from 'wouter';

interface Props {
  notifications: NotificationItem[];
}

const DISPLAY_DURATION = 5000;

export function NotificationToast({ notifications }: Props) {
  const [visible, setVisible] = useState<NotificationItem[]>([]);
  const shownRef = useRef<Set<string>>(new Set());
  const [, navigate] = useLocation();

  useEffect(() => {
    const newItems = notifications.filter(n => !shownRef.current.has(n.id)).slice(0, 3);
    if (newItems.length === 0) return;

    newItems.forEach(item => shownRef.current.add(item.id));
    setVisible(prev => [...newItems, ...prev].slice(0, 3));

    const timer = setTimeout(() => {
      setVisible(prev => prev.filter(n => !newItems.some(ni => ni.id === n.id)));
    }, DISPLAY_DURATION);

    return () => clearTimeout(timer);
  }, [notifications]);

  const dismiss = (id: string) => {
    setVisible(prev => prev.filter(n => n.id !== id));
  };

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 end-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {visible.map(item => (
        <div
          key={item.id}
          className="bg-card border border-border rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 cursor-pointer animate-in slide-in-from-right-5 duration-300"
          onClick={() => {
            dismiss(item.id);
            if (item.url) navigate(item.url);
          }}
        >
          <Bell className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.body}</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(item.id); }}
            className="text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
