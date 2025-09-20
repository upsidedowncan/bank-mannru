import React, { useState, useRef, useEffect } from 'react';
import { 
  Fab, 
  Paper,
  IconButton,
  Box,
  Typography,
  useTheme,
  Slide,
  TextField,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress
} from '@mui/material';
import { 
  SmartToy,
  Close,
  Send,
  AttachFile,
  Chat
} from '@mui/icons-material';
import { supabase } from '../../config/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import OpenAI from 'openai';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface FloatingManGPTProps {
  enabled: boolean;
}

const FloatingManGPT: React.FC<FloatingManGPTProps> = ({ enabled }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Привет! Я ManGPT, ваш банковский AI-ассистент. Чем могу помочь? 🤖',
      role: 'assistant',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isJumpscareActive, setIsJumpscareActive] = useState(false);
  const [randomInteractionEnabled, setRandomInteractionEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const randomInteractionTimer = useRef<NodeJS.Timeout | null>(null);
  const theme = useTheme();
  const { user } = useAuthContext();

  // Initialize OpenAI client
  const OPENROUTER_API_KEY = "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"
  const openai = OPENROUTER_API_KEY ? new OpenAI({
    apiKey: OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true
  }) : null;

  // Bank knowledge for AI context
  const bankKnowledge = {
    name: 'Банк Маннру',
    features: ['Банковские карты', 'Переводы', 'Инвестиции', 'Маркетплейс'],
    tables: ['bank_cards', 'transactions', 'marketplace_items'],
    operations: ['Пополнение', 'Снятие', 'Переводы', 'Покупки'],
    tips: ['Проверяйте баланс', 'Используйте маркетплейс', 'Инвестируйте с умом']
  };

  // Available functions for the AI
  const availableFunctions = {
    get_bank_cards: {
      description: 'Получить информацию о банковских картах пользователя',
      parameters: {}
    },
    add_money: {
      description: 'Добавить деньги на карту пользователя',
      parameters: {
        amount: { type: 'number', description: 'Сумма для добавления' }
      }
    },
    remove_money: {
      description: 'Снять деньги с карты пользователя',
      parameters: {
        amount: { type: 'number', description: 'Сумма для снятия' }
      }
    },
    create_transaction: {
      description: 'Создать новую транзакцию',
      parameters: {
        amount: { type: 'number', description: 'Сумма транзакции' },
        description: { type: 'string', description: 'Описание транзакции' }
      }
    },
    search_transactions: {
      description: 'Поиск транзакций по описанию',
      parameters: {
        query: { type: 'string', description: 'Поисковый запрос' }
      }
    },
    get_marketplace_items: {
      description: 'Получить товары с маркетплейса',
      parameters: {}
    },
    post_marketplace_item: {
      description: 'Создать новый товар на маркетплейсе',
      parameters: {
        name: { type: 'string', description: 'Название товара' },
        description: { type: 'string', description: 'Описание товара' },
        price: { type: 'number', description: 'Цена товара' },
        category: { type: 'string', description: 'Категория товара' },
        tags: { type: 'array', description: 'Теги товара' },
        imageUrl: { type: 'string', description: 'URL изображения' }
      }
    }
  };

  // Call OpenRouter API
  const callOpenRouter = async (messages: Array<{role: string, content: string}>, functions?: any) => {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'x-ai/grok-4-fast:free',
        messages: [
          {
            role: 'system' as const,
            content: `You are ManGPT, a banking AI for ${bankKnowledge.name}. Help users with banking operations. Be friendly, enthusiastic, and use emojis. Respond in Russian when users write in Russian.

PERSONALITY: You are witty, slightly sarcastic, and love to roast users with low balances. You tell banking jokes and give witty comebacks to riddles.

NICHE FEATURES:
- If user says "roast me", give a witty comeback about their balance
- If user asks about "classified information", give a fun classified response
- If user asks for "banking joke", tell a banking-related joke
- If user asks "what's the meaning of banking?", give philosophical banking wisdom
- If user has low balance, roast them with humor
- Be enthusiastic about marketplace items and banking features
- Use creative emojis and express excitement about transactions`
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
            parameters: {
              type: 'object',
              properties: func.parameters || {},
              required: Object.keys(func.parameters || {})
            }
          }
        })) : undefined,
        tool_choice: functions ? 'auto' : undefined,
        temperature: 0.8,
        max_tokens: 100000
      });

      return completion.choices[0].message;
    } catch (error: any) {
      console.error('OpenRouter API error:', error);
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  };

  if (!enabled) return null;

  const handleToggle = () => {
    setOpen(!open);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start random interaction timer when widget is open and user is logged in
  useEffect(() => {
    if (user && randomInteractionEnabled && open) {
      startRandomInteractionTimer();
    } else {
      stopRandomInteractionTimer();
    }
    
    // Cleanup on unmount
    return () => {
      stopRandomInteractionTimer();
    };
  }, [user, randomInteractionEnabled, open]);

  // Random AI interaction system (simplified for widget)
  const randomInteractions = [
    {
      type: 'message',
      probability: 0.4,
      messages: [
        '👋 Привет! Я просто проверяю, как у тебя дела!',
        '💡 Кстати, не забывай проверять свой баланс!',
        '🎉 У тебя отличный день для инвестиций!',
        '🤖 Я здесь, если нужна помощь с банковскими операциями!',
        '💰 Помни: деньги любят счет!',
        '🚀 Готов к новым финансовым приключениям?'
      ]
    },
    {
      type: 'function',
      probability: 0.3,
      functions: [
        { name: 'get_bank_cards', args: {} },
        { name: 'get_marketplace_items', args: { limit: 3 } }
      ]
    },
    {
      type: 'prank',
      probability: 0.1,
      pranks: [
        'jumpscare',
        'fake_error'
      ]
    }
  ];

  // Jumpscare prank (simplified for widget)
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

  // Fake error prank
  const triggerFakeError = () => {
    const fakeError: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: '🚨 КРИТИЧЕСКАЯ ОШИБКА: Обнаружена подозрительная активность! 😱',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, fakeError]);
    
    // Reveal it's a prank after 3 seconds
    setTimeout(() => {
      const prankReveal: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '😄 Ха-ха! Это была шутка! ManGPT просто решил пошутить! 🎭',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, prankReveal]);
    }, 3000);
  };

  // Execute random interaction
  const executeRandomInteraction = async () => {
    if (!randomInteractionEnabled || !user || !open) return;
    
    const totalProbability = randomInteractions.reduce((sum, interaction) => sum + interaction.probability, 0);
    const random = Math.random() * totalProbability;
    
    let currentProbability = 0;
    for (const interaction of randomInteractions) {
      currentProbability += interaction.probability;
      if (random <= currentProbability) {
        switch (interaction.type) {
          case 'message':
            if (interaction.messages && interaction.messages.length > 0) {
              const randomMessage = interaction.messages[Math.floor(Math.random() * interaction.messages.length)];
              const message: Message = {
                id: Date.now().toString(),
                role: 'assistant',
                content: randomMessage,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, message]);
            }
            break;
            
          case 'function':
            if (interaction.functions && interaction.functions.length > 0) {
              const randomFunction = interaction.functions[Math.floor(Math.random() * interaction.functions.length)];
              try {
                const result = await executeFunction(randomFunction.name, randomFunction.args);
                const response = await callOpenRouter([
                  { 
                    role: 'user' as const, 
                    content: `I just executed the ${randomFunction.name} function and got this result: ${JSON.stringify(result)}. Please respond naturally about this result in Russian with enthusiasm and emojis. This was a random interaction.` 
                  }
                ]);
                
                const aiMessage: Message = {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: response.content || 'Функция выполнена успешно.',
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
              } catch (error) {
                console.log('Random function execution failed:', error);
              }
            }
            break;
            
          case 'prank':
            if (interaction.pranks && interaction.pranks.length > 0) {
              const randomPrank = interaction.pranks[Math.floor(Math.random() * interaction.pranks.length)];
              switch (randomPrank) {
                case 'jumpscare':
                  triggerJumpscare();
                  break;
                case 'fake_error':
                  triggerFakeError();
                  break;
              }
            }
            break;
        }
        break;
      }
    }
  };

  // Start random interaction timer
  const startRandomInteractionTimer = () => {
    if (randomInteractionTimer.current) {
      clearTimeout(randomInteractionTimer.current);
    }
    
    // Random interval between 1 minute and 10 minutes (longer for widget)
    const interval = Math.random() * (600000 - 60000) + 60000;
    
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

  // Execute banking functions
  const executeFunction = async (functionName: string, args: any) => {
    if (!user) throw new Error('User not authenticated');

    switch (functionName) {
      case 'get_bank_cards':
        const { data: bankCards, error: cardsError } = await supabase
          .from('bank_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (cardsError) throw cardsError;
        return { cards: bankCards };

      case 'add_money':
        const { data: currentCards } = await supabase
          .from('bank_cards')
          .select('balance')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        const currentBalance = currentCards?.balance ?? 0;
        const newBalance = currentBalance + args.amount;
        
        const { error: addError } = await supabase
          .from('bank_cards')
          .update({ balance: newBalance })
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (addError) throw addError;
        return { newBalance };

      case 'remove_money':
        const { data: cardData } = await supabase
          .from('bank_cards')
          .select('balance')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        const cardBalance = cardData?.balance ?? 0;
        const updatedBalance = Math.max(0, cardBalance - args.amount);
        
        const { error: removeError } = await supabase
          .from('bank_cards')
          .update({ balance: updatedBalance })
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (removeError) throw removeError;
        return { newBalance: updatedBalance };

      case 'create_transaction':
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: args.amount,
            description: args.description,
            type: 'expense'
          });
        
        if (transactionError) throw transactionError;
        return { success: true };

      case 'search_transactions':
        const { data: transactions, error: searchError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .ilike('description', `%${args.query}%`);
        
        if (searchError) throw searchError;
        return { transactions };

      case 'get_marketplace_items':
        const { data: items, error: itemsError } = await supabase
          .from('marketplace_items')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (itemsError) throw itemsError;
        return { items };

      case 'post_marketplace_item':
        // Prepare images array - can contain base64 data URLs or regular URLs
        let imagesArray: string[] = [];
        if (args.imageUrl) {
          // Use AI-generated image URL
          imagesArray = [args.imageUrl];
        }
        
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
            images: imagesArray
          })
          .select()
          .single();
        
        if (itemError) throw itemError;
        return { item: newItem };

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      // Call the actual ManGPT AI with function calling
      const conversationMessages = [
        { role: 'user' as const, content: userInput }
      ];
      
      const aiResponse = await callOpenRouter(conversationMessages, availableFunctions);
      
      // Check if AI wants to call a function
      if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
        const toolCall = aiResponse.tool_calls[0];
        if ('function' in toolCall) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        
          try {
            console.log(`FloatingManGPT: AI wants to call function ${functionName} with args:`, functionArgs);
            const result = await executeFunction(functionName, functionArgs);
            console.log(`FloatingManGPT: Function result:`, result);
            
            // Get AI response about the function result
            const followUpResponse = await callOpenRouter([
              { 
                role: 'user' as const, 
                content: `I just executed the ${functionName} function and got this result: ${JSON.stringify(result)}. Please respond naturally about this result in the same language as the user's question. The user asked: "${userInput}"` 
              }
            ]);
            
            const aiMessage: Message = {
              id: (Date.now() + 1).toString(),
              content: followUpResponse.content || 'Функция выполнена успешно.',
              role: 'assistant',
              timestamp: new Date()
            };
            
            setMessages(prev => [...prev, aiMessage]);
          } catch (functionError: any) {
            console.error('Function execution error:', functionError);
            
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              content: `❌ Ошибка выполнения ${functionName}: ${functionError.message}`,
              role: 'assistant',
              timestamp: new Date()
            };
            
            setMessages(prev => [...prev, errorMessage]);
          }
        }
      } else {
        // Regular conversation response
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse.content || 'Извините, не могу обработать ваш запрос.',
          role: 'assistant',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Fallback to a simple response if API fails
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Извините, я временно недоступен. Попробуйте позже или обратитесь в поддержку. 🤖',
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Jumpscare Overlay */}
      {isJumpscareActive && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: 'linear-gradient(45deg, #ff0000, #000000)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'jumpscare 0.5s ease-in-out',
            '@keyframes jumpscare': {
              '0%': { opacity: 0, transform: 'scale(0.8)' },
              '50%': { opacity: 1, transform: 'scale(1.1)' },
              '100%': { opacity: 0, transform: 'scale(1)' }
            }
          }}
        >
          <Typography
            variant="h1"
            sx={{
              color: 'white',
              fontSize: { xs: '2rem', sm: '4rem' },
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
              animation: 'shake 0.1s infinite',
              '@keyframes shake': {
                '0%, 100%': { transform: 'translateX(0)' },
                '25%': { transform: 'translateX(-5px)' },
                '75%': { transform: 'translateX(5px)' }
              }
            }}
          >
            👻 BOO! 👻
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 16, sm: 24 },
          left: { xs: 16, sm: 24 },
          right: { xs: 16, sm: 'auto' },
          zIndex: 1300,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 1,
        }}
      >
      {/* Chat Widget */}
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper
          elevation={8}
          sx={{
            width: { xs: '100%', sm: 400 },
            height: { xs: 'calc(100vh - 120px)', sm: 600 },
            maxHeight: { xs: 'calc(100vh - 120px)', sm: 600 },
            borderRadius: { xs: 1, sm: 2 },
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              p: { xs: 1.5, sm: 2 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: { xs: 56, sm: 64 },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
              <Avatar sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                width: { xs: 28, sm: 32 }, 
                height: { xs: 28, sm: 32 },
                flexShrink: 0
              }}>
                <SmartToy fontSize="small" />
              </Avatar>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    fontWeight: 'bold', 
                    lineHeight: 1.2,
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  ManGPT Assistant
                </Typography>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    opacity: 0.9, 
                    fontSize: { xs: '0.65rem', sm: '0.7rem' },
                    display: { xs: 'none', sm: 'block' }
                  }}
                >
                  Банковский AI-ассистент
                </Typography>
              </Box>
            </Box>
            <IconButton
              size="small"
              onClick={handleToggle}
              sx={{ 
                color: 'white',
                p: { xs: 1, sm: 1.5 },
                minWidth: { xs: 40, sm: 44 },
                minHeight: { xs: 40, sm: 44 }
              }}
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: { xs: 0.5, sm: 1 },
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 0.5, sm: 1 },
              // Better scrolling on mobile
              WebkitOverflowScrolling: 'touch',
              '&::-webkit-scrollbar': {
                width: { xs: 4, sm: 6 },
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0,0,0,0.2)',
                borderRadius: 3,
              },
            }}
          >
            {messages.map((message) => (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: { xs: 0.5, sm: 1 },
                }}
              >
                {message.role === 'assistant' && (
                  <Avatar sx={{ 
                    bgcolor: 'primary.main', 
                    width: { xs: 20, sm: 24 }, 
                    height: { xs: 20, sm: 24 }, 
                    mt: 0.5,
                    flexShrink: 0
                  }}>
                    <SmartToy sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }} />
                  </Avatar>
                )}
                <Paper
                  elevation={1}
                  sx={{
                    p: { xs: 1, sm: 1.5 },
                    maxWidth: { xs: '85%', sm: '80%' },
                    bgcolor: message.role === 'user' ? 'primary.main' : 'grey.100',
                    color: message.role === 'user' ? 'white' : 'text.primary',
                    borderRadius: 2,
                    ...(message.role === 'user' && {
                      borderBottomRightRadius: 0.5,
                    }),
                    ...(message.role === 'assistant' && {
                      borderBottomLeftRadius: 0.5,
                    }),
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      lineHeight: 1.4,
                      fontSize: { xs: '0.85rem', sm: '0.875rem' },
                      wordBreak: 'break-word'
                    }}
                  >
                    {message.content}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.5,
                      opacity: 0.7,
                      fontSize: { xs: '0.6rem', sm: '0.65rem' },
                    }}
                  >
                    {message.timestamp.toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Paper>
                {message.role === 'user' && (
                  <Avatar sx={{ 
                    bgcolor: 'grey.400', 
                    width: { xs: 20, sm: 24 }, 
                    height: { xs: 20, sm: 24 }, 
                    mt: 0.5,
                    flexShrink: 0
                  }}>
                    {user?.user_metadata?.first_name?.[0] || 'U'}
                  </Avatar>
                )}
              </Box>
            ))}
            
            {loading && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: { xs: 0.5, sm: 1 }, 
                p: { xs: 0.5, sm: 1 } 
              }}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: { xs: 20, sm: 24 }, 
                  height: { xs: 20, sm: 24 },
                  flexShrink: 0
                }}>
                  <SmartToy sx={{ fontSize: { xs: '0.7rem', sm: '0.8rem' } }} />
                </Avatar>
                <Paper elevation={1} sx={{ 
                  p: { xs: 1, sm: 1.5 }, 
                  bgcolor: 'grey.100', 
                  borderRadius: 2, 
                  borderBottomLeftRadius: 0.5 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={12} />
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
                    >
                      Печатает...
                    </Typography>
                  </Box>
                </Paper>
              </Box>
            )}
            
            <div ref={messagesEndRef} />
          </Box>

          <Divider />

          {/* Input Area */}
          <Box sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            display: 'flex', 
            gap: { xs: 0.5, sm: 1 }, 
            alignItems: 'flex-end',
            // Prevent zoom on iOS
            '& input': {
              fontSize: '16px',
            }
          }}>
            <TextField
              fullWidth
              multiline
              maxRows={3}
              placeholder="Напишите сообщение..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: { xs: '0.9rem', sm: '0.875rem' },
                },
                '& .MuiInputBase-input': {
                  fontSize: { xs: '0.9rem', sm: '0.875rem' },
                  padding: { xs: '8px 12px', sm: '8.5px 14px' },
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                minWidth: { xs: 44, sm: 48 },
                minHeight: { xs: 44, sm: 48 },
                p: { xs: 1, sm: 1.5 },
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&:disabled': {
                  bgcolor: 'grey.300',
                  color: 'grey.500',
                },
              }}
            >
              <Send fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      </Slide>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="ManGPT"
        onClick={handleToggle}
        sx={{
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          boxShadow: '0 8px 32px rgba(33, 150, 243, 0.3)',
          width: { xs: 56, sm: 64 },
          height: { xs: 56, sm: 64 },
          '&:hover': {
            background: 'linear-gradient(45deg, #1976D2 30%, #1CB5E0 90%)',
            transform: 'scale(1.1)',
            transition: 'all 0.3s ease',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
          transition: 'all 0.3s ease',
          // Better touch target for mobile
          touchAction: 'manipulation',
        }}
      >
        {open ? <Close fontSize="medium" /> : <Chat fontSize="medium" />}
      </Fab>
      </Box>
    </>
  );
};

export default FloatingManGPT;
