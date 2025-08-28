import { useState, useRef, useCallback } from 'react';
import { supabase } from '../../../config/supabase';
import { ChatMessage, ChatChannel } from '../types';
import { User } from '@supabase/supabase-js';

export const useChatInput = (
  user: User | null,
  selectedChannel: ChatChannel | null,
  isUserAdmin: () => Promise<boolean>,
  showSnackbar: (message: string, severity: 'success' | 'error') => void,
  replyingTo: ChatMessage | null,
  setReplyingTo: (message: ChatMessage | null) => void,
  onMessageSent: () => void
) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Media upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  const sendMessage = useCallback(async () => {
    const messageText = newMessage.trim();
    if (!user || !selectedChannel || !messageText) return;

    if (sending) return;

    if (selectedChannel.admin_only) {
      const isAdmin = await isUserAdmin();
      if (!isAdmin) {
        showSnackbar('Только администраторы могут отправлять сообщения в этот канал', 'error');
        return;
      }
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          message: messageText,
          message_type: 'text',
          reply_to: replyingTo?.id || null,
        });

      if (error) throw error;

      onMessageSent();
      setNewMessage('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      showSnackbar('Ошибка при отправке сообщения', 'error');
    } finally {
      setSending(false);
    }
  }, [user, selectedChannel, newMessage, showSnackbar, sending, isUserAdmin, replyingTo, setReplyingTo, onMessageSent]);

  const sendMediaMessage = useCallback(async () => {
    if (!selectedFile || !user || !selectedChannel) return;

    if (selectedChannel.admin_only) {
      const isAdmin = await isUserAdmin();
      if (!isAdmin) {
        showSnackbar('Только администраторы могут отправлять медиа в этот канал', 'error');
        return;
      }
    }

    setUploadingMedia(true);
    try {
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `media_${user.id}_${timestamp}.${fileExtension}`;
      const filePath = `chat-media/${selectedChannel.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, selectedFile, { cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      const messageType = selectedFile.type.startsWith('image/') ? 'image' : 'video';

      const { error: dbError } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          message: '',
          message_type: messageType,
          media_url: urlData.publicUrl,
          media_type: selectedFile.type,
          reply_to: replyingTo?.id || null,
        });

      if (dbError) throw dbError;

      onMessageSent();
      showSnackbar('Медиа отправлено!', 'success');
      setSelectedFile(null);
      setMediaPreview(null);
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending media:', error);
      showSnackbar('Ошибка при отправке медиа', 'error');
    } finally {
      setUploadingMedia(false);
    }
  }, [selectedFile, user, selectedChannel, isUserAdmin, showSnackbar, onMessageSent, replyingTo, setReplyingTo, setSelectedFile, setMediaPreview]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
  }, [setNewMessage]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showSnackbar('Файл слишком большой. Максимальный размер: 50MB', 'error');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showSnackbar('Поддерживаются только изображения и видео', 'error');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelMedia = () => {
    setSelectedFile(null);
    setMediaPreview(null);
  };

  return {
    newMessage,
    sending,
    sendMessage,
    handleInputChange,
    uploadingMedia,
    selectedFile,
    mediaPreview,
    handleFileSelect,
    handleCancelMedia,
    sendMediaMessage,
    setNewMessage,
  };
};
