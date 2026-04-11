import React, { useState, useEffect, useRef } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAppPublicChat, useAppSendPublicMessage, useAppUploadMedia } from '@/hooks/use-auth-api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Megaphone, ImagePlus, Send, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/utils';
import { useStore } from '@/store';
import { format } from 'date-fns';
import { useAdminTranslation } from '@/lib/portalI18n';
import type { ChatMessage } from '@workspace/api-client-react';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function PublicChat() {
  const { data: messages, isLoading } = useAppPublicChat();
  const { mutateAsync: sendMsg } = useAppSendPublicMessage();
  const { mutateAsync: uploadMedia } = useAppUploadMedia();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const token = useStore(s => s.token);
  const { t } = useAdminTranslation();

  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      await sendMsg({ data: { content: content.trim() } });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/public'] });
      setContent('');
    } catch (e) {
      toast({ title: t('adminOrderError'), description: getErrorMessage(e), variant: 'destructive' });
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
      await sendMsg({ data: { mediaUrl: (result as { url: string }).url, mediaType } });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/public'] });
    } catch (e) {
      toast({ title: t('adminUploadFailed'), description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setUploadingImg(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        <div className="flex items-center gap-2 mb-4">
          <Megaphone className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">{t('adminPublicChatTitle')}</h2>
          <span className="text-sm text-muted-foreground ms-1">{t('adminPublicChatSubtitle')}</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 bg-muted/20 rounded-2xl p-4 border border-border">
          {isLoading && <p className="text-center py-8 text-muted-foreground">{t('adminLoading')}</p>}
          {!isLoading && (!messages || messages.length === 0) && (
            <p className="text-center py-8 text-muted-foreground">{t('adminPublicChatEmpty')}</p>
          )}
          {(messages || []).map((msg: ChatMessage) => (
            <div key={msg.id} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
              {msg.mediaUrl && msg.mediaType === 'image' && (
                <img src={msg.mediaUrl} alt="attachment" className="mt-2 max-h-64 rounded-xl object-cover" />
              )}
              {msg.mediaUrl && msg.mediaType === 'video' && (
                <video src={msg.mediaUrl} controls className="mt-2 max-h-64 rounded-xl w-full object-contain bg-black" />
              )}
              {msg.mediaUrl && msg.mediaType === 'file' && (
                <a
                  href={msg.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 text-xs text-primary underline"
                >
                  📎 {msg.mediaUrl.split('/').pop() || t('adminDownloadFile')}
                </a>
              )}
              <div className="flex items-center gap-3 mt-3">
                <span className="text-xs text-muted-foreground">
                  {format(new Date(msg.createdAt), 'MMM dd – hh:mm a')}
                </span>
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex gap-1">
                    {msg.reactions.map((r) => (
                      <span key={r.emoji} className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                        {r.emoji} {r.count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 bg-card border border-border rounded-2xl p-3 shadow-sm">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('adminPublicChatPlaceholder')}
            className="resize-none border-0 bg-transparent text-sm focus-visible:ring-0 p-0"
            rows={2}
          />
          <div className="flex items-center justify-between mt-2">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx"
                className="hidden"
                onChange={handleMediaUpload}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImg}
                className="text-muted-foreground hover:text-primary"
              >
                {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              </Button>
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || !content.trim()}
              size="sm"
              className="gap-2"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('adminPublicChatBroadcast')}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
