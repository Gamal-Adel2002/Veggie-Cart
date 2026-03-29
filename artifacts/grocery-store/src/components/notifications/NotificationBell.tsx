import React, { useState, useRef, useEffect } from 'react';
import { Bell, X, ChevronRight } from 'lucide-react';
import { useNotifications, NotificationItem } from '@/contexts/NotificationContext';
import { useTranslation } from '@/lib/i18n';
import { useLocation } from 'wouter';

function timeAgo(ts: number, lang: string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (lang === 'ar') {
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} س`;
    return `منذ ${Math.floor(hrs / 24)} ي`;
  }
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, markRead, clear } = useNotifications();
  const { t, lang } = useTranslation();
  const [, navigate] = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open && unreadCount > 0) {
      setTimeout(markAllRead, 300);
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    markRead(item.id);
    setOpen(false);
    if (item.url) navigate(item.url);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label={t('notifBell')}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">{t('notifTitle')}</span>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={clear}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t('notifClearAll')}
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t('notifEmpty')}
              </div>
            ) : (
              notifications.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-start px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors flex items-start gap-3 ${!item.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!item.read && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />}
                      <span className="text-sm font-medium truncate">{item.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.body}</p>
                    <span className="text-xs text-muted-foreground/60 mt-1">{timeAgo(item.timestamp, lang)}</span>
                  </div>
                  {item.url && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
