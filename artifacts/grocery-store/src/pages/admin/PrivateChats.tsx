import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import {
  useAppPrivateConversations, useAppPrivateThread,
  useAppSendPrivateMessage, useAppMarkThreadRead, useAppSendTyping, useAppUploadMedia,
} from '@/hooks/use-auth-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Loader2, ImagePlus, Check, CheckCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useStore } from '@/store';
import { format } from 'date-fns';
import type { ChatMessage, PrivateConversation } from '@workspace/api-client-react';

function Avatar({ name, image }: { name: string; image?: string | null }) {
  return image ? (
    <img src={image} alt={name} className="w-9 h-9 rounded-full object-cover shrink-0" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ThreadPanel({
  conv, token, adminId
}: { conv: PrivateConversation; token: string | null; adminId: number | null }) {
  const customerId = conv.customerId;
  const { data: messages, refetch } = useAppPrivateThread(customerId);
  const { mutateAsync: sendMsg } = useAppSendPrivateMessage();
  const { mutateAsync: markRead } = useAppMarkThreadRead();
  const { mutateAsync: sendTyping } = useAppSendTyping();
  const { mutateAsync: uploadMedia } = useAppUploadMedia();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [typingVisible, setTypingVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // SSE for real-time updates for this thread
  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}&watchThread=${customerId}`);
    eventSourceRef.current = es;

    es.addEventListener('private_chat_message', (e) => {
      const data = JSON.parse(e.data) as ChatMessage;
      const cId = data.senderRole === 'customer' ? data.senderId : data.recipientId;
      if (cId === customerId) {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['/api/chat/private'] });
      }
    });

    es.addEventListener('chat_typing', (e) => {
      const data = JSON.parse(e.data);
      if (data.customerId === customerId && data.typingRole === 'customer') {
        setTypingVisible(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingVisible(false), 3000);
      }
    });

    es.addEventListener('chat_read_receipt', (e) => {
      const data = JSON.parse(e.data);
      if (data.customerId === customerId) { refetch(); }
    });

    return () => { es.close(); if (typingTimer.current) clearTimeout(typingTimer.current); };
  }, [token, customerId, refetch, queryClient]);

  // Mark as read when viewing
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    markRead({ customerId }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['/api/chat/private'] });
  }, [customerId, messages?.length]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = useCallback(() => {
    sendTyping({ customerId }).catch(() => {});
  }, [sendTyping, customerId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await sendMsg({ customerId, data: { content: text.trim() } });
      setText('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/chat/private'] });
    } catch (e) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const result = await uploadMedia({ data: { file } });
      const mediaType = (result as { url: string; mediaType: string }).mediaType;
      await sendMsg({ customerId, data: { mediaUrl: (result as { url: string }).url, mediaType } });
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/chat/private'] });
    } catch (e) {
      toast({ title: 'Upload failed', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { handleSend(); }
  };

  const msgList: ChatMessage[] = messages || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card/80">
        <Avatar name={conv.customerName} image={conv.customerImage} />
        <div>
          <p className="font-semibold text-sm">{conv.customerName}</p>
          <p className="text-xs text-muted-foreground">{conv.customerPhone}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgList.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No messages yet. Start the conversation.</p>
        )}
        {msgList.map((msg) => {
          const isMine = msg.senderRole === 'admin';
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                {msg.mediaUrl && msg.mediaType === 'image' && (
                  <img src={msg.mediaUrl} alt="attachment" className="mt-1 max-h-48 rounded-xl object-cover" />
                )}
                {msg.mediaUrl && msg.mediaType === 'video' && (
                  <video src={msg.mediaUrl} controls className="mt-1 max-h-48 rounded-xl w-full" />
                )}
                {msg.mediaUrl && msg.mediaType === 'file' && (
                  <a
                    href={msg.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-1 flex items-center gap-2 text-xs underline ${isMine ? 'text-primary-foreground/80' : 'text-primary'}`}
                  >
                    📎 {msg.mediaUrl.split('/').pop() || 'Download file'}
                  </a>
                )}
                <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                  <span className={`text-[10px] ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {format(new Date(msg.createdAt), 'hh:mm a')}
                  </span>
                  {isMine && (
                    msg.readAt
                      ? <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                      : <Check className="w-3 h-3 text-primary-foreground/50" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {typingVisible && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2 text-xs text-muted-foreground italic">
              {conv.customerName} is typing…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card/80">
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx" className="hidden" onChange={handleMediaUpload} />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploadingImg} className="text-muted-foreground hover:text-primary shrink-0">
            {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </Button>
          <Input
            value={text}
            onChange={e => { setText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()} className="shrink-0">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PrivateChats() {
  const { data: conversations, isLoading } = useAppPrivateConversations();
  const token = useStore(s => s.token);
  const user = useStore(s => s.user);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const convList: PrivateConversation[] = Array.isArray(conversations) ? conversations as PrivateConversation[] : [];
  const selected = convList.find(c => c.customerId === selectedId) || null;

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-10rem)] bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Sidebar */}
        <div className="w-72 border-e border-border flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" /> Private Chats
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && <p className="text-center py-8 text-muted-foreground text-sm">Loading...</p>}
            {!isLoading && convList.length === 0 && (
              <p className="text-center py-8 text-muted-foreground text-sm">No conversations yet.</p>
            )}
            {convList.map(c => (
              <button
                key={c.customerId}
                onClick={() => setSelectedId(c.customerId)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-start border-b border-border/50 transition-colors ${selectedId === c.customerId ? 'bg-primary/10' : 'hover:bg-muted/60'}`}
              >
                <Avatar name={c.customerName} image={c.customerImage} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm truncate">{c.customerName}</p>
                    {c.unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full ms-1 shrink-0">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  {c.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate">
                      {c.lastMessage.senderRole === 'admin' ? 'You: ' : ''}{c.lastMessage.content || '📎 Attachment'}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Thread panel */}
        <div className="flex-1">
          {selected ? (
            <ThreadPanel conv={selected} token={token} adminId={user?.id ?? null} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
              <MessageCircle className="w-12 h-12 opacity-20" />
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
