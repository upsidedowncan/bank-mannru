import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../../../config/supabase';
import { ChatMessage, ChatChannel } from '../types';
import { User } from '@supabase/supabase-js';

// Debounce utility
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useChatInput = (
  user: User | null,
  selectedChannel: ChatChannel | null,
  isUserAdmin: () => Promise<boolean>,
  showSnackbar: (message: string, severity: 'success' | 'error') => void,
  replyingTo: ChatMessage | null,
  setReplyingTo: (message: ChatMessage | null) => void,
  onMessageSent: () => void,
  handleCommand: (command: string) => void
) => {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Media upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Typing indicators disabled for better performance
  // const debouncedMessage = useDebounce(newMessage, 300);
  // const debouncedMessage = newMessage; // Direct assignment for immediate response

  const sendMessage = useCallback(async () => {
    const messageText = newMessage.trim();
    if (!user || !selectedChannel || !messageText) return;

    if (messageText.startsWith('/')) {
      handleCommand(messageText);
      setNewMessage('');
      return;
    }

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
      
      // Clear typing indicator immediately after sending
      setIsTyping(false);
      if (selectedChannel) {
        supabase.channel(`typing:${selectedChannel.id}`).send({
          type: 'broadcast',
          event: 'stop-typing',
          payload: { user_id: user?.id }
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showSnackbar('Ошибка при отправке сообщения', 'error');
    } finally {
      setSending(false);
    }
  }, [user, selectedChannel, newMessage, showSnackbar, sending, isUserAdmin, replyingTo, setReplyingTo, onMessageSent, handleCommand]);

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
    setUploadProgress(0);
    
    try {
      const timestamp = Date.now();
      const fileExtension = selectedFile.name.split('.').pop();
      const fileName = `media_${user.id}_${timestamp}.${fileExtension}`;
      const filePath = `chat-media/${selectedChannel.id}/${fileName}`;

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, selectedFile, { 
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);
      setUploadProgress(100);

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
      setUploadProgress(0);
    } catch (error) {
      console.error('Error sending media:', error);
      showSnackbar('Ошибка при отправке медиа', 'error');
    } finally {
      setUploadingMedia(false);
      setUploadProgress(0);
    }
  }, [selectedFile, user, selectedChannel, isUserAdmin, showSnackbar, onMessageSent, replyingTo, setReplyingTo, setSelectedFile, setMediaPreview]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    // Clear existing typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new typing timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (selectedChannel) {
        supabase.channel(`typing:${selectedChannel.id}`).send({
          type: 'broadcast',
          event: 'stop-typing',
          payload: { user_id: user?.id }
        });
      }
    }, 3000);
  }, [setNewMessage, selectedChannel, user]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      showSnackbar('Файл слишком большой. Максимальный размер: 50MB', 'error');
      return;
    }

    // Validate file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      showSnackbar('Поддерживаются только изображения и видео', 'error');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [showSnackbar]);

  const handleCancelMedia = useCallback(() => {
    setSelectedFile(null);
    setMediaPreview(null);
    setUploadProgress(0);
  }, []);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      
      // Validate file
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
    }
  }, [showSnackbar]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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
    isTyping,
    uploadProgress,
    handleDragOver,
    handleDrop,
  };
};
