import { useState, useCallback, useRef } from 'react';

const getBlobDuration = (blob: Blob): Promise<number> => {
  const tempAudio = document.createElement('audio');
  const tempUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    tempAudio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(tempUrl);
      resolve(tempAudio.duration);
    });
    tempAudio.addEventListener('error', (e) => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error('Failed to load audio metadata.'));
    });
    tempAudio.src = tempUrl;
  });
};

export const useVoiceRecording = (
  onRecordingComplete: (blob: Blob, duration: number) => void,
  showSnackbar: (message: string, severity: 'success' | 'error') => void
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        if (chunks.length === 0) {
          showSnackbar('Ошибка: нет аудиоданных', 'error');
          return;
        }
        const blob = new Blob(chunks, { type: 'audio/webm' });
        try {
          const duration = await getBlobDuration(blob);
          onRecordingComplete(blob, duration);
        } catch (error) {
          console.error(error);
          showSnackbar('Не удалось получить длительность аудио', 'error');
          // Still send the message, just without the duration
          onRecordingComplete(blob, 0);
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
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
  }, [onRecordingComplete, showSnackbar]);

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
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cleanup,
  };
};
