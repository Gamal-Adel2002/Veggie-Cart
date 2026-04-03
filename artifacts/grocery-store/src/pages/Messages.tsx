import React, { useEffect, useRef, useCallback } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import {
  useAppPrivateThread, useAppSendPrivateMessage, useAppMarkThreadRead, useAppSendTyping, useAppUploadImage,
} from '@/hooks/use-auth-api';
import { useStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Loader2, ImagePlus, Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import type { ChatMessage } from '@workspace/api-client-react';

export default function Messages() {
  const user = useStore(s => s.user);
  const token = useStore(s => s.token);
  const customerId = user?.id ?? 0;

  const { data: messages, refetch } = useAppPrivateThread(customerId);
  const { mutateAsync: sendMsg } = useAppSendPrivateMessage();
  const { mutateAsync: markRead } = useAppMarkThreadRead();
  const { mutateAsync: sendTyping } = useAppSendTyping();
  const { mutateAsync: uploadImage } = useAppUploadImage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SSE for real-time updates
  useEffect(() => {
    if (!token || !customerId) return;
    const es = new EventSource(`/api/notifications/stream?token=${encodeURIComponent(token)}&watchThread=${customerId}`);

    es.addEventListener('private_chat_message', (e) => {
      const data = JSON.parse(e.data) as ChatMessage;
      const cId = data.senderRole === 'admin' ? data.recipientId : data.senderId;
      if (cId === customerId) {
        refetch();
        markRead({ customerId }).catch(() => {});
      }
    });

    es.addEventListener('chat_typing', (e) => {
      const data = JSON.parse(e.data);
      if (data.typingRole === 'admin') {
        setAdminTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setAdminTyping(false), 3000);
      }
    });

    es.addEventListener('chat_read_receipt', () => {
      refetch();
    });

    return () => { es.close(); if (typingTimer.current) clearTimeout(typingTimer.current); };
  }, [token, customerId, refetch, markRead]);

  // Mark read on load
  useEffect(() => {
    if (!messages || messages.length === 0 || !customerId) return;
    markRead({ customerId }).catch(() => {});
  }, [customerId, messages?.length]);

  // Scroll to bottom
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !customerId) return;
    setUploadingImg(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await uploadImage({ data: formData as Parameters<typeof uploadImage>[0]['data'] });
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
          <p>Please log in to view your messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">Support Chat</p>
            <p className="text-xs text-muted-foreground">Our team typically replies quickly</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-muted/20 rounded-2xl border border-border p-4 space-y-3 min-h-96">
          {msgList.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm">No messages yet. Send us a message!</p>
            </div>
          )}
          {msgList.map((msg: ChatMessage) => {
            const isMine = msg.senderRole === 'customer';
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card border border-border text-foreground rounded-bl-sm'}`}>
                  {!isMine && (
                    <p className="text-[11px] font-semibold text-primary mb-1">Support Team</p>
                  )}
                  {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                  {msg.mediaUrl && msg.mediaType !== 'video' && (
                    <img src={msg.mediaUrl} alt="attachment" className="mt-1 max-h-48 rounded-xl object-cover" />
                  )}
                  {msg.mediaUrl && msg.mediaType === 'video' && (
                    <video src={msg.mediaUrl} controls className="mt-1 max-h-48 rounded-xl w-full" />
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
          {adminTyping && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-2 text-xs text-muted-foreground italic">
                Support is typing…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-3 bg-card border border-border rounded-2xl p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleImageUpload} />
            <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={uploadingImg} className="text-muted-foreground hover:text-primary shrink-0">
              {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            </Button>
            <Input
              value={text}
              onChange={e => { setText(e.target.value); handleTyping(); }}
              onKeyDown={handleKeyDown}
              placeholder="Message support…"
              className="flex-1"
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !text.trim()} className="shrink-0">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
