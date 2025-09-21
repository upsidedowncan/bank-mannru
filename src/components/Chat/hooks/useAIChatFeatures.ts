import { useState, useCallback, useRef, useEffect } from 'react';
import OpenAI from 'openai';

// Initialize OpenAI client
const OPENROUTER_API_KEY = "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";
const openai = OPENROUTER_API_KEY ? new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: true
}) : null;

interface MessageSuggestion {
  id: string;
  text: string;
  confidence: number;
}

interface ChatContext {
  channelName: string;
  recentMessages: string[];
  userRole: 'user' | 'admin';
}

export const useAIChatFeatures = (
  enabled: boolean,
  currentMessage: string,
  channelName: string,
  recentMessages: string[],
  userRole: 'user' | 'admin' = 'user'
) => {
  const [suggestions, setSuggestions] = useState<MessageSuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [contentModerationResult, setContentModerationResult] = useState<{
    isAppropriate: boolean;
    reason?: string;
    confidence: number;
  } | null>(null);
  const [isModerating, setIsModerating] = useState(false);
  
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const moderationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cache to prevent duplicate API calls
  const suggestionCache = useRef<Map<string, MessageSuggestion[]>>(new Map());
  const moderationCache = useRef<Map<string, ContentModerationResult>>(new Map());
  
  // Throttle mechanism to prevent too many rapid calls
  const lastSuggestionTime = useRef<number>(0);
  const lastModerationTime = useRef<number>(0);
  const THROTTLE_DELAY = 200; // Reduced to 200ms for better responsiveness

  // Generate message suggestions based on context
  const generateSuggestions = useCallback(async (message: string, context: ChatContext) => {
    if (!enabled || !openai || !message.trim() || message.length < 3) {
      setSuggestions([]);
      return;
    }

    // Skip if message is too long (likely spam or not useful for suggestions)
    if (message.trim().length > 200) {
      setSuggestions([]);
      return;
    }

    // Throttle check
    const now = Date.now();
    if (now - lastSuggestionTime.current < THROTTLE_DELAY) {
      return;
    }
    lastSuggestionTime.current = now;

    // Check cache first
    const cacheKey = `${message.trim()}_${context.channelName}`;
    if (suggestionCache.current.has(cacheKey)) {
      setSuggestions(suggestionCache.current.get(cacheKey)!);
      return;
    }

    try {
      setIsGeneratingSuggestions(true);
      
      const response = await openai.chat.completions.create({
        model: 'mistralai/mistral-small-3.2-24b-instruct:free',
        messages: [
          {
            role: 'system',
            content: `Ты помощник для генерации предложений сообщений в чате банка Маннру.

Контекст:
- Канал: ${context.channelName}
- Роль пользователя: ${context.userRole}
- Последние сообщения: ${context.recentMessages.slice(-5).join(', ')}

ВАЖНО: Ты генерируешь предложения того, что ПОЛЬЗОВАТЕЛЬ может написать, а НЕ ответы от AI.

Задача: Предложи 3 варианта того, что пользователь может написать, начиная с "${message}"

Требования:
- Предложения должны быть от лица пользователя (1-е лицо: "я", "мне", "у меня")
- Предложения должны быть естественными и подходящими для банковского чата
- Учитывай контекст канала и последние сообщения
- Предложения должны быть на русском языке
- Каждое предложение должно быть полным и законченным
- НЕ используй фразы типа "Привет! Чем могу помочь" - это ответы AI, а не сообщения пользователя

Примеры правильных предложений:
- "Привет! У меня вопрос по счету"
- "Мне нужно пополнить карту"
- "Когда будет готов новый функционал?"

Формат ответа (JSON):
{
  "suggestions": [
    {"text": "предложение 1", "confidence": 85},
    {"text": "предложение 2", "confidence": 78},
    {"text": "предложение 3", "confidence": 92}
  ]
}`
          },
          {
            role: 'user',
            content: `Пользователь начал писать сообщение: "${message}"

Сгенерируй 3 варианта того, что пользователь может написать дальше. Это должны быть сообщения ОТ ПОЛЬЗОВАТЕЛЯ, а не ответы AI.`
          }
        ],
        max_tokens: 15000,
        temperature: 0.7
      });

      const result = response.choices[0]?.message?.content?.trim() || '';
      
      // Parse JSON response with better error handling
      const jsonMatch = result.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          let jsonString = jsonMatch[0];
          
          // Try to fix common JSON issues
          if (!jsonString.includes(']')) {
            // If JSON is incomplete, try to close it
            jsonString = jsonString.replace(/(\s*)$/, ']}');
          }
          
          const data = JSON.parse(jsonString);
                 if (data.suggestions && Array.isArray(data.suggestions)) {
                   const formattedSuggestions = data.suggestions
                     .filter((suggestion: any) => suggestion.text && suggestion.text.trim().length > 0)
                     .map((suggestion: any, index: number) => ({
                       id: `suggestion-${Date.now()}-${index}`,
                       text: suggestion.text || '',
                       confidence: suggestion.confidence || 50
                     }));
                   setSuggestions(formattedSuggestions);
                   // Cache the results
                   suggestionCache.current.set(cacheKey, formattedSuggestions);
                 } else {
                   setSuggestions([]);
                 }
        } catch (parseError) {
          console.error('Error parsing suggestions JSON:', parseError);
          console.error('Raw response:', result);
          setSuggestions([]);
        }
      } else {
        console.log('No JSON found in response:', result);
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [enabled]);

  // Moderate message content
  const moderateContent = useCallback(async (message: string) => {
    if (!enabled || !openai || !message.trim()) {
      setContentModerationResult(null);
      return;
    }

    // Skip moderation for very short messages
    if (message.trim().length < 4) {
      setContentModerationResult(null);
      return;
    }

    // Skip moderation for very long messages (likely not spam)
    if (message.trim().length > 500) {
      setContentModerationResult({ isAppropriate: true, confidence: 100 });
      return;
    }

    // Throttle check
    const now = Date.now();
    if (now - lastModerationTime.current < THROTTLE_DELAY) {
      return;
    }
    lastModerationTime.current = now;

    // Check cache first
    const cacheKey = message.trim();
    if (moderationCache.current.has(cacheKey)) {
      setContentModerationResult(moderationCache.current.get(cacheKey)!);
      return;
    }

    try {
      setIsModerating(true);
      
      const response = await openai.chat.completions.create({
        model: 'mistralai/mistral-small-3.2-24b-instruct:free',
        messages: [
          {
            role: 'system',
            content: `Ты модератор контента для банковского чата. Проверь сообщение на предмет:

ЗАПРЕЩЕНО:
- Оскорбления, мат, ненормативная лексика
- Спам, реклама, мошенничество
- Личная информация (телефоны, адреса, паспорта)
- Финансовые советы без лицензии
- Политические дискуссии
- Непристойный контент

РАЗРЕШЕНО:
- Обычное общение
- Вопросы о банковских услугах
- Обсуждение игр и развлечений
- Техническая поддержка

Отвечай в формате JSON:
{
  "isAppropriate": true/false,
  "reason": "причина если не подходит",
  "confidence": число_от_0_до_100
}`
          },
          {
            role: 'user',
            content: `Проверь сообщение: "${message}"`
          }
        ],
        max_tokens: 15000,
        temperature: 0.1
      });

      const result = response.choices[0]?.message?.content?.trim() || '';
      console.log('AI moderation response:', result);
      
      // Parse JSON response
      const jsonMatch = result.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const moderation = JSON.parse(jsonMatch[0]);
          const result = {
            isAppropriate: moderation.isAppropriate || false,
            reason: moderation.reason || '',
            confidence: moderation.confidence || 50
          };
          setContentModerationResult(result);
          // Cache the results
          moderationCache.current.set(cacheKey, result);
        } catch (parseError) {
          console.error('Error parsing moderation JSON:', parseError);
          setContentModerationResult({
            isAppropriate: true,
            reason: 'Ошибка анализа',
            confidence: 0
          });
        }
      } else {
        setContentModerationResult({
          isAppropriate: true,
          reason: 'Не удалось проанализировать',
          confidence: 0
        });
      }
    } catch (error) {
      console.error('Error moderating content:', error);
      setContentModerationResult({
        isAppropriate: true,
        reason: 'Ошибка модерации',
        confidence: 0
      });
    } finally {
      setIsModerating(false);
    }
  }, [enabled]);

  // Debounced suggestion generation
  useEffect(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    if (currentMessage.trim().length >= 3) { // Reduced minimum length for better UX
      suggestionTimeoutRef.current = setTimeout(() => {
        const context: ChatContext = {
          channelName,
          recentMessages,
          userRole
        };
        generateSuggestions(currentMessage, context);
      }, 500); // Reduced delay to 500ms for better responsiveness
    } else {
      setSuggestions([]);
    }

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [currentMessage, channelName, userRole]); // Removed generateSuggestions and recentMessages from deps

  // Debounced content moderation
  useEffect(() => {
    if (moderationTimeoutRef.current) {
      clearTimeout(moderationTimeoutRef.current);
    }

    if (currentMessage.trim().length >= 4) { // Reduced minimum length for moderation
      moderationTimeoutRef.current = setTimeout(() => {
        moderateContent(currentMessage);
      }, 800); // Reduced delay to 800ms for better responsiveness
    } else {
      setContentModerationResult(null);
    }

    return () => {
      if (moderationTimeoutRef.current) {
        clearTimeout(moderationTimeoutRef.current);
      }
    };
  }, [currentMessage]); // Removed moderateContent from deps

  // Clear suggestions when message is sent
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setContentModerationResult(null);
  }, []);

  return {
    suggestions,
    isGeneratingSuggestions,
    contentModerationResult,
    isModerating,
    clearSuggestions,
    generateSuggestions: (message: string, context: ChatContext) => generateSuggestions(message, context),
    moderateContent: (message: string) => moderateContent(message)
  };
};
