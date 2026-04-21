import React, { useEffect, useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppPublicChat, useAppReactToPublicMessage } from '@/hooks/use-auth-api';
import { useStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { Megaphone, CircleNotch } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import type { ChatMessage } from '@workspace/api-client-react';
import { useTranslation } from '@/lib/i18n';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function PublicFeed() {
  const { t } = useTranslation();
  const { data: messages, isLoading, refetch } = useAppPublicChat();
  const { mutateAsync: react } = useAppReactToPublicMessage();
  const token = useStore(s => s.token);
  const user = useStore(s => s.user);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
    eventSourceRef.current = es;
    es.addEventListener('public_chat_message', () => { queryClient.invalidateQueries({ queryKey: ['/api/chat/public'] }); });
    es.addEventListener('public_chat_reaction', () => { queryClient.invalidateQueries({ queryKey: ['/api/chat/public'] }); });
    return () => { es.close(); };
  }, [token, queryClient]);

  const handleReact = async (msgId: number, emoji: string) => {
    if (!user) { toast({ title: 'Login required', variant: 'destructive' }); return; }
    try {
      await react({ id: msgId, data: { emoji } });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/public'] });
    } catch (e) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    }
  };

  const msgList: ChatMessage[] = (messages || []) as ChatMessage[];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-1.5">{t('feed')}</p>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: 'var(--font-serif)' }}>
            <Megaphone className="w-7 h-7 text-primary" weight="fill" /> {t('publicFeedTitle')}
          </h1>
        </div>

        {isLoading && (
          <div className="flex justify-center py-16">
            <CircleNotch className="w-7 h-7 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && msgList.length === 0 && (
          <div className="bg-card border border-dashed border-border rounded-xl p-16 text-center">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-20" />
            <p className="font-semibold text-foreground">{t('noBroadcastsYet')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('noBroadcastsDesc')}</p>
          </div>
        )}

        <div className="space-y-4">
          {msgList.map((msg: ChatMessage, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="bg-card border border-border/40 rounded-xl p-5 shadow-sm"
            >
              {msg.content && <p className="text-sm leading-relaxed text-foreground">{msg.content}</p>}
              {msg.mediaUrl && msg.mediaType === 'video' && (
                <video src={msg.mediaUrl} controls className="mt-3 max-h-72 rounded-lg w-full bg-black" />
              )}
              {msg.mediaUrl && msg.mediaType !== 'video' && (
                <img src={msg.mediaUrl} alt="broadcast" className="mt-3 max-h-72 rounded-lg object-cover w-full" />
              )}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(msg.createdAt), 'MMM dd – hh:mm a')}
                </span>

                {msg.reactions && msg.reactions.map(r => {
                  const reacted = user && r.userIds.includes(user.id);
                  return (
                    <button
                      key={r.emoji}
                      onClick={() => handleReact(msg.id, r.emoji)}
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm border transition-all ${
                        reacted
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-muted border-border/50 hover:bg-primary/8 hover:border-primary/20'
                      }`}
                    >
                      {r.emoji} <span className="text-xs font-medium">{r.count}</span>
                    </button>
                  );
                })}

                {user && (
                  <div className="flex gap-1">
                    {REACTION_EMOJIS.filter(e => !msg.reactions?.some(r => r.emoji === e)).slice(0, 3).map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(msg.id, emoji)}
                        className="w-7 h-7 flex items-center justify-center text-sm rounded-full hover:bg-muted transition-colors opacity-30 hover:opacity-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
