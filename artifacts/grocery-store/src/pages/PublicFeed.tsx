import React, { useEffect, useRef } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { useAppPublicChat, useAppReactToPublicMessage } from '@/hooks/use-auth-api';
import { useStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { Megaphone } from '@phosphor-icons/react';
import { format } from 'date-fns';
import type { ChatMessage } from '@workspace/api-client-react';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function PublicFeed() {
  const { data: messages, isLoading, refetch } = useAppPublicChat();
  const { mutateAsync: react } = useAppReactToPublicMessage();
  const token = useStore(s => s.token);
  const user = useStore(s => s.user);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const eventSourceRef = useRef<EventSource | null>(null);

  // SSE for real-time updates
  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}`);
    eventSourceRef.current = es;
    es.addEventListener('public_chat_message', () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/public'] });
    });
    es.addEventListener('public_chat_reaction', () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/public'] });
    });
    return () => { es.close(); };
  }, [token, queryClient]);

  const handleReact = async (msgId: number, emoji: string) => {
    if (!user) { toast({ title: 'Login required', description: 'Please log in to react.', variant: 'destructive' }); return; }
    try {
      await react({ id: msgId, data: { emoji } });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/public'] });
    } catch (e) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    }
  };

  const msgList: ChatMessage[] = (messages || []) as ChatMessage[];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Megaphone className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Public Feed</h1>
        </div>

        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && msgList.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No broadcasts yet. Check back soon!</p>
          </div>
        )}

        <div className="space-y-4">
          {msgList.map((msg: ChatMessage) => (
            <div key={msg.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
              {msg.mediaUrl && msg.mediaType === 'video' && (
                <video src={msg.mediaUrl} controls className="mt-2 max-h-72 rounded-xl w-full bg-black" />
              )}
              {msg.mediaUrl && msg.mediaType !== 'video' && (
                <img src={msg.mediaUrl} alt="broadcast" className="mt-2 max-h-72 rounded-xl object-cover w-full" />
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(msg.createdAt), 'MMM dd – hh:mm a')}
                </span>

                {/* Existing reactions */}
                {msg.reactions && msg.reactions.map(r => {
                  const reacted = user && r.userIds.includes(user.id);
                  return (
                    <button
                      key={r.emoji}
                      onClick={() => handleReact(msg.id, r.emoji)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${
                        reacted ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-muted border-border hover:bg-primary/10'
                      }`}
                    >
                      {r.emoji} <span className="text-xs font-medium">{r.count}</span>
                    </button>
                  );
                })}

                {/* Add reaction */}
                {user && (
                  <div className="flex gap-1">
                    {REACTION_EMOJIS.filter(e => !msg.reactions?.some(r => r.emoji === e)).slice(0, 3).map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReact(msg.id, emoji)}
                        className="w-6 h-6 flex items-center justify-center text-sm rounded-full hover:bg-muted transition-colors opacity-40 hover:opacity-100"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
