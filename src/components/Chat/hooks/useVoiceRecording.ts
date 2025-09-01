import { useState, useCallback, useRef } from 'react';

const getBlobDuration = (blob: Blob): Promise<number> => {
  return new Promise((resolve, reject) => {
    const tempAudio = document.createElement('audio');
    const tempUrl = URL.createObjectURL(blob);
    
    tempAudio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(tempUrl);
      if (tempAudio.duration && isFinite(tempAudio.duration) && tempAudio.duration > 0) {
        resolve(tempAudio.duration);
      } else {
        reject(new Error('Invalid audio duration'));
      }
    });
    
    tempAudio.addEventListener('error', () => {
      URL.revokeObjectURL(tempUrl);
      reject(new Error('Failed to load audio metadata'));
    });
    
    tempAudio.preload = 'metadata';
    tempAudio.src = tempUrl;
    tempAudio.load();
  });
};

export const useVoiceRecording = (
  onRecordingComplete: (blob: Blob, duration: number) => void,
  showSnackbar: (message: string, severity: 'success' | 'error') => void
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      // Try different MIME types for better compatibility
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/ogg;codecs=opus';
          }
        }
      }
      
      const recorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000
      });
      const chunks: Blob[] = [];
      let recordingStartTime = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const actualRecordingTime = Math.round((Date.now() - recordingStartTime) / 1000);
        
        if (chunks.length === 0) {
          showSnackbar('Ошибка: нет аудиоданных', 'error');
          return;
        }
        const blob = new Blob(chunks, { type: mimeType });
        
        try {
          const duration = await getBlobDuration(blob);
          onRecordingComplete(blob, duration);
        } catch (error) {
          console.error('Error getting audio duration:', error);
          // Use actual recording time as fallback
          onRecordingComplete(blob, actualRecordingTime);
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start(1000);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      const interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      setRecordingInterval(interval);
    } catch (error) {
      console.error('Error starting recording:', error);
      showSnackbar('Ошибка при записи голоса', 'error');
    }
  }, [onRecordingComplete, showSnackbar]);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
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
    recordingTime,
    startRecording,
    stopRecording,
    cleanup,
  };
};
