import { useState, useCallback, useRef } from 'react';
import { supabase } from '../../../config/supabase';
import { ChatChannel } from '../types';
import { User } from '@supabase/supabase-js';

export const useVoiceRecording = (
  user: User | null,
  selectedChannel: ChatChannel | null,
  isUserAdmin: () => Promise<boolean>,
  showSnackbar: (message: string, severity: 'success' | 'error') => void
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSendingVoice, setIsSendingVoice] = useState(false);

  const sendVoiceMessage = useCallback(async (blobToSend?: Blob) => {
    const audioData = blobToSend || audioBlob;

    if (!audioData || !user || !selectedChannel) {
      return;
    }

    if (selectedChannel.admin_only) {
      const isAdmin = await isUserAdmin();
      if (!isAdmin) {
        showSnackbar('Только администраторы могут отправлять голосовые сообщения в этот канал', 'error');
        return;
      }
    }

    if (audioData.size === 0) {
      showSnackbar('Ошибка: пустая аудиозапись', 'error');
      return;
    }

    setIsSendingVoice(true);
    try {
      const timestamp = Date.now();
      const filename = `voice_${user.id}_${timestamp}.webm`;
      const filePath = `voice-messages/${selectedChannel.id}/${filename}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-audio')
        .upload(filePath, audioData, { contentType: 'audio/webm', cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-audio')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('chat_messages')
        .insert({
          channel_id: selectedChannel.id,
          user_id: user.id,
          message: '[Голосовое сообщение]',
          message_type: 'voice',
          audio_url: urlData.publicUrl,
        });

      if (dbError) throw dbError;

      setAudioBlob(null);
      showSnackbar('Голосовое сообщение отправлено', 'success');
    } catch (error) {
      console.error('Error sending voice message:', error);
      showSnackbar('Ошибка при отправке голосового сообщения', 'error');
    } finally {
      setIsSendingVoice(false);
    }
  }, [audioBlob, user, selectedChannel, isUserAdmin, showSnackbar]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        if (chunks.length === 0) {
          showSnackbar('Ошибка: нет аудиоданных', 'error');
          return;
        }
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        setTimeout(() => sendVoiceMessage(blob), 100);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);

      const interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      setRecordingInterval(interval);
    } catch (error) {
      console.error('Error starting recording:', error);
      showSnackbar('Ошибка при записи голоса', 'error');
    }
  }, [sendVoiceMessage, showSnackbar]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorder && isRecording && !isPaused) {
      mediaRecorder.pause();
      setIsPaused(true);
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  }, [mediaRecorder, isRecording, isPaused, recordingInterval]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorder && isRecording && isPaused) {
      mediaRecorder.resume();
      setIsPaused(false);
      const interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
      setRecordingInterval(interval);
    }
  }, [mediaRecorder, isRecording, isPaused]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (recordingInterval) {
        clearInterval(recordingInterval);
        setRecordingInterval(null);
      }
    }
  }, [mediaRecorder, isRecording, recordingInterval]);

  const cleanup = useCallback(() => {
    if (recordingInterval) clearInterval(recordingInterval);
    if (mediaRecorder && isRecording) mediaRecorder.stop();
  }, [recordingInterval, mediaRecorder, isRecording]);

  return {
    isRecording,
    isPaused,
    recordingTime,
    isSendingVoice,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cleanup,
  };
};
