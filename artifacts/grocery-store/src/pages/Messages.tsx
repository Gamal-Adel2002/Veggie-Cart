import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import {
  useAppPrivateThread, useAppSendPrivateMessage, useAppMarkThreadRead, useAppSendTyping, useAppUploadMedia,
} from '@/hooks/use-auth-api';
import { useStore } from '@/store';
import { usePushSubscription } from '@/hooks/use-push-subscription';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ChatCircle, PaperPlaneRight, CircleNotch, ImageSquare, Check, Checks } from '@phosphor-icons/react';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import type { ChatMessage } from '@workspace/api-client-react';

export default function Messages() {
  const user = useStore(s => s.user);
  const token = useStore(s => s.token);
  const customerId = user?.id ?? 0;

  usePushSubscription();

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
  const [adminTyping, setAdminTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token || !customerId) return;
    const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}&watchThread=${customerId}`);

    es.addEventListener('private_chat_message', (e) => {
      const data = JSON.parse(e.data) as ChatMessage;
      const cId = data.senderRole === 'admin' ? data.recipientId : data.senderId;
      if (cId === customerId) { refetch(); markRead({ customerId }).catch(() => {}); }
    });
    es.addEventListener('chat_typing', (e) => {
      const data = JSON.parse(e.data);
      if (data.typingRole === 'admin') {
        setAdminTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setAdminTyping(false), 3000);
      }
    });
    es.addEventListener('chat_read_receipt', () => { refetch(); });

    return () => { es.close(); if (typingTimer.current) clearTimeout(typingTimer.current); };
  }, [token, customerId, refetch, markRead]);

  useEffect(() => {
    if (!messages || messages.length === 0 || !customerId) return;
    markRead({ customerId }).catch(() => {});
  }, [customerId, messages?.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = useCallback(() => {
    if (customerId) sendTyping({ customerId }).catch(() => {});
  }, [sendTyping, customerId]);

  const handleSend = async () => {
    if (!text.trim() || !customerId) return;
    setSending(true);
    try {
      await sendMsg({ customerId, data: { content: text.trim() } });
      setText('');
      refetch();
    } catch (e) {
      toast({ title: 'Error', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !customerId) return;
    setUploadingImg(true);
    try {
      const result = await uploadMedia({ data: { file } });
      const mediaType = (result as { url: string; mediaType: string }).mediaType;
      await sendMsg({ customerId, data: { mediaUrl: (result as { url: string }).url, mediaType } });
      refetch();
    } catch (e) {
      toast({ title: 'Upload failed', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  const msgList: ChatMessage[] = (messages || []) as ChatMessage[];

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <ChatCircle className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
          <p className="font-semibold">Please log in to view messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-5">
          <p className="text-accent font-semibold text-xs uppercase tracking-[0.18em] mb-1.5">{t('messagesSupport')}</p>
          <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>{t('messagesTitle')}</h1>
        </div>

        {/* Chat header card */}
        <div className="bg-card border border-border/40 rounded-xl px-4 py-3 flex items-center gap-3 mb-4 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <ChatCircle className="w-[18px] h-[18px] text-primary" weight="fill" />
          </div>
          <div>
            <p className="font-semibold text-sm">{t('supportTeamName')}</p>
            <p className="text-xs text-muted-foreground">{t('supportTeamSubtitle')}</p>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto bg-muted/20 border border-border/40 rounded-xl p-4 space-y-3 min-h-80">
          {msgList.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <ChatCircle className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">{t('noMessagesYet')}</p>
            </div>
          )}
          {msgList.map((msg: ChatMessage) => {
            const isMine = msg.senderRole === 'customer';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border/60 text-foreground rounded-bl-sm'
                }`}>
                  {!isMine && (
                    <p className="text-[10px] font-semibold text-primary mb-1 uppercase tracking-wider">{t('supportSender')}</p>
                  )}
                  {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                  {msg.mediaUrl && msg.mediaType === 'image' && (
                    <img src={msg.mediaUrl} alt="attachment" className="mt-2 max-h-48 rounded-lg object-cover" />
                  )}
                  {msg.mediaUrl && msg.mediaType === 'video' && (
                    <video src={msg.mediaUrl} controls className="mt-2 max-h-48 rounded-lg w-full" />
                  )}
                  {msg.mediaUrl && msg.mediaType === 'file' && (
                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer"
                      className={`mt-1 flex items-center gap-1.5 text-xs underline ${isMine ? 'text-primary-foreground/80' : 'text-primary'}`}
                    >
                      📎 {msg.mediaUrl.split('/').pop() || 'Download file'}
                    </a>
                  )}
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {format(new Date(msg.createdAt), 'hh:mm a')}
                    </span>
                    {isMine && (
                      msg.readAt
                        ? <Checks className="w-3 h-3 text-primary-foreground/60" />
                        : <Check className="w-3 h-3 text-primary-foreground/40" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {adminTyping && (
            <div className="flex justify-start">
              <div className="bg-card border border-border/60 rounded-2xl rounded-bl-sm px-4 py-2 text-xs text-muted-foreground italic">
                Support is typing…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-3 bg-card border border-border/40 rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx" className="hidden" onChange={handleMediaUpload} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImg}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-muted transition-colors shrink-0"
            >
              {uploadingImg ? <CircleNotch className="w-4 h-4 animate-spin" /> : <ImageSquare className="w-4 h-4" />}
            </button>
            <Input
              value={text}
              onChange={e => { setText(e.target.value); handleTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder={t('messageSupportPlaceholder')}
              className="flex-1 h-9 border-border/60 focus-visible:ring-primary/30 bg-background rounded-lg"
            />
            <motion.button
              onClick={handleSend}
              disabled={sending || !text.trim()}
              whileHover={!sending && text.trim() ? { scale: 1.05 } : {}}
              whileTap={!sending && text.trim() ? { scale: 0.95 } : {}}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0"
            >
              {sending ? <CircleNotch className="w-4 h-4 animate-spin" /> : <PaperPlaneRight className="w-4 h-4" weight="fill" />}
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
}
