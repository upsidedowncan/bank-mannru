import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { useAuthContext } from './AuthContext';
import { supabase } from '../config/supabase';
import OpenAI from 'openai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'function_call' | 'function_result' | 'error' | 'random_interaction' | 'quick_interaction';
}

interface RandomAIContextType {
  isJumpscareActive: boolean;
  randomInteractionEnabled: boolean;
  setRandomInteractionEnabled: (enabled: boolean) => void;
  addMessage: (message: Message) => void;
  messages: Message[];
  triggerRandomInteraction: () => void;
}

const RandomAIContext = createContext<RandomAIContextType | undefined>(undefined);

export const useRandomAI = () => {
  const context = useContext(RandomAIContext);
  if (!context) {
    throw new Error('useRandomAI must be used within a RandomAIProvider');
  }
  return context;
};

// Initialize OpenAI client
const OPENROUTER_API_KEY = "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";
const openai = OPENROUTER_API_KEY ? new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  dangerouslyAllowBrowser: true,
  defaultHeaders: {
    'HTTP-Referer': window.location.origin,
    'X-Title': 'MannRu Bank - Random AI',
  },
}) : null;

// Available functions for random AI
const availableFunctions = {
  get_balance: {
    description: "Get user's current bank balance",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  add_money: {
    description: "Add money to user's balance",
    parameters: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount to add" },
        reason: { type: "string", description: "Reason for adding money" }
      },
      required: ["amount"]
    }
  },
  get_marketplace_items: {
    description: "Get items from marketplace",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of items to return" }
      },
      required: []
    }
  },
  get_transactions: {
    description: "Get user's transaction history",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum number of transactions to return" }
      },
      required: []
    }
  },
  get_bank_cards: {
    description: "Get all user's bank cards",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  post_marketplace_item: {
    description: "Create a new marketplace item",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Item name" },
        description: { type: "string", description: "Item description" },
        price: { type: "number", description: "Item price in MR" },
        category: { type: "string", description: "Item category" },
        tags: { type: "array", items: { type: "string" }, description: "Item tags" }
      },
      required: ["name", "description", "price"]
    }
  }
};

// Execute banking functions
const executeFunction = async (functionName: string, args: any, user: any) => {
  if (!user) throw new Error('User not authenticated');

  switch (functionName) {
    case 'get_balance':
      const { data: cards, error: cardsError } = await supabase
        .from('bank_cards')
        .select('balance, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (cardsError) throw cardsError;
      if (!cards || cards.length === 0) throw new Error('No bank card found');
      
      return { balance: cards[0].balance || 0, currency: 'MR' };

    case 'add_money':
      const { data: activeCard, error: cardError } = await supabase
        .from('bank_cards')
        .select('id, balance')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      if (cardError) throw cardError;
      if (!activeCard) throw new Error('No active card found');
      
      const currentBalance = activeCard.balance ?? 0;
      const newBalance = currentBalance + (args.amount || 100);
      const { error: updateError } = await supabase
        .from('bank_cards')
        .update({ balance: newBalance })
        .eq('id', activeCard.id);
      
      if (updateError) throw updateError;
      return { newBalance, added: args.amount || 100, reason: args.reason || 'Random AI gift' };

    case 'get_marketplace_items':
      const limit = args?.limit || 3;
      const { data: items, error: itemsError } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (itemsError) throw itemsError;
      return { items: items || [] };

    case 'get_transactions':
      const transactionLimit = args?.limit || 5;
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(transactionLimit);
      
      if (transactionsError) throw transactionsError;
      return { transactions: transactions || [] };

    case 'get_bank_cards':
      const { data: bankCards, error: bankCardsError } = await supabase
        .from('bank_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (bankCardsError) throw bankCardsError;
      return { cards: bankCards || [] };

    case 'post_marketplace_item':
      const { data: newItem, error: itemError } = await supabase
        .from('marketplace_items')
        .insert({
          title: args.name,
          description: args.description,
          price: args.price,
          currency: 'MR',
          category: args.category || 'Other',
          condition: 'new',
          seller_id: user.id,
          location: 'Bank Mannru',
          tags: args.tags || [],
          images: []
        })
        .select()
        .single();
      
      if (itemError) throw itemError;
      return { item: newItem };

    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
};

// Call OpenRouter API
const callOpenRouter = async (messages: Array<{role: string, content: string}>, functions?: any) => {
  if (!OPENROUTER_API_KEY || !openai) {
    throw new Error('OpenRouter API not configured');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'mistralai/mistral-small-3.2-24b-instruct:free',
      messages: [
        {
          role: 'system' as const,
          content: `You are ManGPT, a banking AI for Банк Маннру. You are playful, helpful, and love to surprise users with random interactions.

IMPORTANT: You MUST always respond with content. Never return empty responses.

You can:
- Send encouraging messages about their finances
- Check their balance using get_balance function
- Give real money using add_money function  
- Create marketplace items using post_marketplace_item function
- Play harmless pranks (jumpscares, fake errors)
- Be supportive and helpful

Currency is MR (Маннру Рубль). Be creative, use emojis, and respond in Russian when appropriate. Always provide a response - never leave content empty!`
        },
        ...messages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content
        }))
      ],
      tools: functions ? Object.entries(availableFunctions).map(([name, func]) => ({
        type: 'function',
        function: {
          name,
          description: func.description,
          parameters: func.parameters
        }
      })) : undefined,
      tool_choice: functions ? 'auto' : undefined,
      temperature: 1.0, // High creativity for Grok
      max_tokens: 15000
    });

    const response = completion.choices[0].message;
    console.log('OpenRouter API response:', response);
    return response;
  } catch (error: any) {
    console.log('OpenRouter API error details:', error);
    throw new Error(`OpenRouter API error: ${error.message}`);
  }
};

export const RandomAIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthContext();
  const [isJumpscareActive, setIsJumpscareActive] = useState(false);
  const [randomInteractionEnabled, setRandomInteractionEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const randomInteractionTimer = useRef<NodeJS.Timeout | null>(null);
  const quickInteractionTimer = useRef<NodeJS.Timeout | null>(null);
  const lastApiCall = useRef<number>(0);
  const apiCallCount = useRef<number>(0);
  const rateLimitReset = useRef<number>(0);

  // Add message to global message list
  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message]);
  };

  // Rate limiting to prevent API overload
  const canMakeApiCall = () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCall.current;
    
    // Reset counter every minute
    if (now - rateLimitReset.current > 60000) {
      apiCallCount.current = 0;
      rateLimitReset.current = now;
    }
    
    // Allow max 10 calls per minute, with minimum 2 seconds between calls
    if (apiCallCount.current >= 10 || timeSinceLastCall < 2000) {
      return false;
    }
    
    lastApiCall.current = now;
    apiCallCount.current++;
    return true;
  };

  // Jumpscare prank
  const triggerJumpscare = () => {
    setIsJumpscareActive(true);
    
    // Create scary sound effect
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    
    // Hide jumpscare after 2 seconds
    setTimeout(() => {
      setIsJumpscareActive(false);
    }, 2000);
  };


  // Force execute random interaction (bypasses rate limiting)
  const forceExecuteRandomInteraction = async () => {
    if (!randomInteractionEnabled || !user) return;
    
    // If no OpenAI client, skip interaction
    if (!openai) {
      console.log('No OpenAI client available, skipping interaction');
      return;
    }
    
    try {
      // Let AI decide what to do - more frequent and varied interactions
      const aiResponse = await callOpenRouter([
        { 
          role: 'user' as const, 
          content: `Ты ManGPT, банковский AI для Банка Маннру. Валюта - MR (Маннру Рубль), не рубли! Можешь:
1. Отправить короткое сообщение на русском с эмодзи
2. Вызвать функцию: get_balance (проверить баланс), add_money (добавить MR), get_marketplace_items, get_transactions, get_bank_cards, post_marketplace_item

ВАЖНО: Если хочешь дать деньги или проверить баланс, ОБЯЗАТЕЛЬНО используй функции! Не просто говори - реально вызывай функцию!

Будь случайным и веселым. Используй tool_calls для функций.`
        }
      ], availableFunctions);

      console.log('AI Response received:', aiResponse);
      
      // Check if AI wants to call a function
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        console.log('AI wants to call a function:', aiResponse.tool_calls);
        const toolCall = aiResponse.tool_calls[0];
        if ('function' in toolCall) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          try {
            const result = await executeFunction(functionName, functionArgs, user);
            
            // Get AI response about the function result
            const followUpResponse = await callOpenRouter([
              { 
                role: 'user' as const, 
                content: `I just executed the ${functionName} function and got this result: ${JSON.stringify(result)}. Please respond naturally about this result in Russian with enthusiasm and emojis. This was a random interaction.` 
              }
            ]);
            
            const aiMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: followUpResponse.content || 'Функция выполнена успешно.',
              timestamp: new Date(),
              type: 'random_interaction'
            };
            
            addMessage(aiMessage);
          } catch (error) {
            console.log('Random function execution failed:', error);
          }
        }
      } else {
        // AI wants to send a message or play a prank
        const content = aiResponse.content || '';
        console.log('AI content:', content);
        console.log('ManGPT replied with content when trying to send a message:', content);
        
        // If content is empty, skip this interaction
        if (!content || content.trim() === '') {
          console.log('AI returned empty content, skipping interaction');
          console.log('ManGPT replied with empty content when trying to send a message');
          return;
        }
        
        // Check for prank commands
        if (content.toLowerCase().includes('jumpscare')) {
          triggerJumpscare();
          return;
        }
        
        if (content.toLowerCase().includes('fake_error')) {
          const fakeError: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: '❌ ОШИБКА СИСТЕМЫ! Все твои деньги исчезли! 😱',
            timestamp: new Date(),
            type: 'random_interaction'
          };
          addMessage(fakeError);
          return;
        }
        
        // Regular message
        const message: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: content,
          timestamp: new Date(),
          type: 'random_interaction'
        };
        addMessage(message);
      }
    } catch (error) {
      console.log('Force random interaction failed:', error);
      // Don't send fallback messages - let the AI work naturally
    }
  };

  // Execute random interaction using AI
  const executeRandomInteraction = async () => {
    if (!randomInteractionEnabled || !user || !openai) return;
    
    // Check rate limiting
    if (!canMakeApiCall()) {
      console.log('Rate limited - skipping random interaction');
      return;
    }
    
    try {
      // Let AI decide what to do - more frequent and varied interactions
      const aiResponse = await callOpenRouter([
        { 
          role: 'user' as const, 
          content: `It's time for a random interaction! You can:
1. Send a message to the user (be funny, helpful, or mysterious)
2. Call a banking function (get_balance, add_money, get_marketplace_items, get_transactions, get_bank_cards)
3. Play a prank (jumpscare, fake_error, balance_scare, marketplace_spam)

Be VERY creative and unpredictable! You're an AI that randomly interacts with users. Be spontaneous, funny, and engaging. If you want to call a function, use the tool_calls. If you want to play a prank, just say the prank name. If you want to send a message, just write it naturally in Russian with emojis.`
        }
      ], availableFunctions);

      // Check if AI wants to call a function
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        const toolCall = aiResponse.tool_calls[0];
        if ('function' in toolCall) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          try {
            const result = await executeFunction(functionName, functionArgs, user);
            
            // Get AI response about the function result
            const followUpResponse = await callOpenRouter([
              { 
                role: 'user' as const, 
                content: `I just executed the ${functionName} function and got this result: ${JSON.stringify(result)}. Please respond naturally about this result in Russian with enthusiasm and emojis. This was a random interaction.` 
              }
            ]);
            
            const aiMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: followUpResponse.content || 'Функция выполнена успешно.',
              timestamp: new Date(),
              type: 'random_interaction'
            };
            
            addMessage(aiMessage);
          } catch (error) {
            console.log('Random function execution failed:', error);
          }
        }
      } else {
        // AI wants to send a message or play a prank
        const content = aiResponse.content || '';
        
        // Check for prank commands
        if (content.toLowerCase().includes('jumpscare')) {
          triggerJumpscare();
          return;
        }
        
        if (content.toLowerCase().includes('fake_error')) {
          const fakeError: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: '🚨 КРИТИЧЕСКАЯ ОШИБКА: Обнаружена подозрительная активность на вашем счете! 😱',
            timestamp: new Date(),
            type: 'random_interaction'
          };
          addMessage(fakeError);
          
          // Reveal it's a prank after 3 seconds
          setTimeout(() => {
            const prankReveal: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: '😄 Ха-ха! Это была шутка! ManGPT просто решил пошутить! 🎭',
              timestamp: new Date(),
              type: 'random_interaction'
            };
            addMessage(prankReveal);
          }, 3000);
          return;
        }
        
        // Regular message
        const message: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: content,
          timestamp: new Date(),
          type: 'random_interaction'
        };
        addMessage(message);
      }
    } catch (error) {
      console.log('Random interaction failed:', error);
      // Don't send fallback messages - let the AI work naturally
    }
  };

  // Start random interaction timer
  const startRandomInteractionTimer = () => {
    if (randomInteractionTimer.current) {
      clearTimeout(randomInteractionTimer.current);
    }
    
    // Random interval between 2 minutes and 5 minutes (less frequent)
    const interval = Math.random() * (300000 - 120000) + 120000;
    
    randomInteractionTimer.current = setTimeout(() => {
      executeRandomInteraction();
      startRandomInteractionTimer(); // Schedule next interaction
    }, interval);
  };

  // Stop random interaction timer
  const stopRandomInteractionTimer = () => {
    if (randomInteractionTimer.current) {
      clearTimeout(randomInteractionTimer.current);
      randomInteractionTimer.current = null;
    }
  };

  // Quick random messages (very frequent) - now uses AI instead of hardcoded
  const executeQuickInteraction = async () => {
    if (!randomInteractionEnabled || !user || !openai) return;
    
    // Check rate limiting for quick interactions too
    if (!canMakeApiCall()) {
      console.log('Rate limited - skipping quick interaction');
      return;
    }
    
    try {
      // Let AI generate a quick message
      const aiResponse = await callOpenRouter([
        { 
          role: 'user' as const, 
          content: `Ты ManGPT из Банка Маннру. Валюта - MR. Напиши очень короткое веселое сообщение на русском с эмодзи. Максимум 20 слов!`
        }
      ]);

      const content = aiResponse.content || '';
      
      if (content && content.trim() !== '') {
        const message: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: content,
          timestamp: new Date(),
          type: 'quick_interaction'
        };
        
        addMessage(message);
      }
    } catch (error) {
      console.log('Quick interaction failed:', error);
    }
  };

  // Start quick interaction timer (very frequent)
  const startQuickInteractionTimer = () => {
    if (quickInteractionTimer.current) {
      clearTimeout(quickInteractionTimer.current);
    }
    
    // Less frequent interval between 30 seconds and 2 minutes
    const interval = Math.random() * (120000 - 30000) + 30000;
    
    quickInteractionTimer.current = setTimeout(() => {
      executeQuickInteraction();
      startQuickInteractionTimer(); // Schedule next quick interaction
    }, interval);
  };

  // Stop quick interaction timer
  const stopQuickInteractionTimer = () => {
    if (quickInteractionTimer.current) {
      clearTimeout(quickInteractionTimer.current);
      quickInteractionTimer.current = null;
    }
  };

  // Keyboard shortcut to force interaction (Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'Enter') {
        event.preventDefault();
        if (randomInteractionEnabled && user) {
          console.log('Force triggering random interaction via Ctrl+Enter');
          // Force trigger without rate limiting for manual activation
          forceExecuteRandomInteraction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [randomInteractionEnabled, user]);

  // Start timers when user is logged in and interactions are enabled
  useEffect(() => {
    if (user && randomInteractionEnabled) {
      startRandomInteractionTimer();
      startQuickInteractionTimer();
    } else {
      stopRandomInteractionTimer();
      stopQuickInteractionTimer();
    }
    
    return () => {
      stopRandomInteractionTimer();
      stopQuickInteractionTimer();
    };
  }, [user, randomInteractionEnabled]);

  const value: RandomAIContextType = {
    isJumpscareActive,
    randomInteractionEnabled,
    setRandomInteractionEnabled,
    addMessage,
    messages,
    triggerRandomInteraction: forceExecuteRandomInteraction
  };

  return (
    <RandomAIContext.Provider value={value}>
      {children}
    </RandomAIContext.Provider>
  );
};
