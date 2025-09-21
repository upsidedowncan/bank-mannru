import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Avatar, 
  Chip, 
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Popover,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { Send, SmartToy, AccountBalance, TrendingUp, ShoppingCart, History, VolumeUp, VolumeOff, Pause, PlayArrow, Settings, AttachFile } from '@mui/icons-material';
import { AppLayout } from '../Layout/AppLayout';
import { useAuthContext } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';
import OpenAI from 'openai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'function_call' | 'function_result' | 'error';
  functionName?: string;
  functionArgs?: any;
  functionResult?: any;
  image?: string; // Base64 image data
}

const ManGPT: React.FC = () => {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1',
      role: 'assistant', 
      content: 'Привет! Я ManGPT, ваш AI-ассистент по банковским операциям! 🏦✨ Чем могу помочь?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechSynthesis = useRef<SpeechSynthesis | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  // Clean AI responses to remove leading whitespace and newlines
  const cleanAIResponse = (text: string): string => {
    return text
      .replace(/^[\s\n\r\t]+/, '') // Remove any leading whitespace, newlines, carriage returns, or tabs
      .replace(/^\s+/, '') // Remove any remaining leading whitespace
      .trim(); // Remove any remaining whitespace from both ends
  };

  // Truncate long responses to prevent context overflow
  const truncateResponse = (text: string, maxLength: number = 2000): string => {
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf('.');
    
    if (lastSentence > maxLength * 0.8) {
      return truncated.substring(0, lastSentence + 1) + '\n\n[Ответ обрезан для экономии места]';
    }
    
    return truncated + '\n\n[Ответ обрезан для экономии места]';
  };

  // Content validation for marketplace items
  const validateItemContent = (itemData: any): { isValid: boolean; reason?: string } => {
    if (!itemData || typeof itemData !== 'object') {
      return { isValid: false, reason: 'Invalid item data' };
    }

    const { name, description, category } = itemData;
    const textToCheck = `${name || ''} ${description || ''} ${category || ''}`.toLowerCase();

    // List of inappropriate keywords
    const inappropriateKeywords = [
      'туалет', 'унитаз', 'канализация', 'какашки', 'дерьмо', 'говно',
      'мусор', 'свалка', 'отходы', 'помойка', 'грязь',
      'toilet', 'bathroom', 'sewage', 'waste', 'garbage', 'trash', 'dump',
      'shit', 'poop', 'crap', 'fuck', 'bitch', 'asshole',
      'оружие', 'пистолет', 'нож', 'убийство', 'насилие',
      'наркотики', 'алкоголь', 'водка', 'пиво', 'сигареты',
      'политика', 'президент', 'выборы', 'война'
    ];

    // Check for inappropriate content
    for (const keyword of inappropriateKeywords) {
      if (textToCheck.includes(keyword)) {
        return { isValid: false, reason: `Inappropriate content detected: ${keyword}` };
      }
    }

    return { isValid: true };
  };


  // Search for images using Wikimedia Commons API with AI-generated keywords
  const searchImageForItem = async (aiGeneratedKeywords: string, itemName?: string, itemDescription?: string): Promise<string> => {
    try {
      // Use the AI-generated English keywords directly
      const keywords = aiGeneratedKeywords.toLowerCase().replace(/\s+/g, '');
      
      const apiUrl = `https://commons.wikimedia.org/w/api.php?` +
        `action=query&format=json&origin=*&` +
        `generator=search&gsrsearch=${encodeURIComponent(keywords)}&gsrlimit=15&gsrnamespace=6&` +
        `prop=imageinfo&iiprop=url`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      console.log('Wikimedia API response:', data);
      console.log('AI-generated keywords:', keywords);
      
      const pages = data.query?.pages || {};
      const urls = Object.values(pages)
        .flatMap((p: any) => p.imageinfo ? p.imageinfo.map((i: any) => i.url) : []);
      
      console.log('Found image URLs:', urls);
      
      if (urls.length > 0) {
        // If we have multiple images, use AI to select the best one
        if (urls.length > 1 && itemName && itemDescription) {
          try {
            const imageSelectionResponse = await callOpenRouter([
              { 
                role: 'system' as const,
                content: `You are ManGPT, a banking AI. I found ${urls.length} images for a marketplace item. You need to select the BEST image that matches the item description. Respond with ONLY the index number (0-${urls.length - 1}) of the best image.`
              },
              { 
                role: 'user' as const, 
                content: `Item: "${itemName}" - ${itemDescription}
                
Image URLs found:
${urls.map((url, index) => `${index}: ${url}`).join('\n')}

Which image index (0-${urls.length - 1}) best matches this item? Respond with ONLY the number.`
              }
            ]);
            
            const selectedIndex = parseInt(imageSelectionResponse.content?.trim() || '0');
            if (selectedIndex >= 0 && selectedIndex < urls.length) {
              console.log(`AI selected image index ${selectedIndex}:`, urls[selectedIndex]);
              return urls[selectedIndex];
            }
          } catch (aiError) {
            console.log('AI image selection failed, using first image:', aiError);
          }
        }
        
        console.log('Using first Wikimedia image:', urls[0]);
        return urls[0]; // Return first image URL as fallback
      }
      
      // Fallback to Unsplash with the same keywords
      console.log('No Wikimedia images found, using Unsplash fallback');
      return `https://source.unsplash.com/400x300/?${keywords}`;
    } catch (error) {
      console.log('Image search failed:', error);
      // Fallback to Unsplash
      return `https://source.unsplash.com/400x300/?${aiGeneratedKeywords}`;
    }
  };

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert image to base64 for storage
  const convertImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(scrollToBottom);
  }, [messages]);



  // Initialize TTS and load voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      speechSynthesis.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const voices = speechSynthesis.current?.getVoices() || [];
        setAvailableVoices(voices);
        
        // Auto-select best voice
        const bestVoice = selectBestVoice(voices);
        setSelectedVoice(bestVoice);
      };
      
      // Load voices immediately
      loadVoices();
      
      // Load voices when they become available
      speechSynthesis.current.onvoiceschanged = loadVoices;
    }
  }, []);

  // Select the best available voice
  const selectBestVoice = (voices: SpeechSynthesisVoice[]) => {
    // Prefer high-quality voices
    const preferredVoices = [
      'Microsoft Zira Desktop - English (United States)',
      'Microsoft David Desktop - English (United States)',
      'Google US English',
      'Alex',
      'Samantha',
      'Victoria',
      'Microsoft Irina Desktop - Russian (Russia)',
      'Google русский',
      'Yuri',
      'Katya'
    ];
    
    // Find preferred voice
    for (const preferred of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferred.split(' - ')[0]));
      if (voice) return voice;
    }
    
    // Fallback to first available voice
    return voices[0] || null;
  };

  // Detect if text is Russian (default to Russian)
  const isRussian = (text: string) => {
    // Default to Russian if no clear language indicators
    if (!text.trim()) return true;
    
    // Check for Russian characters
    const hasRussian = /[а-яё]/i.test(text);
    const hasEnglish = /[a-z]/i.test(text);
    
    // If only Russian, return true
    if (hasRussian && !hasEnglish) return true;
    
    // If only English, return false
    if (hasEnglish && !hasRussian) return false;
    
    // If mixed or empty, default to Russian
    return true;
  };

  // Enhanced free TTS with better voice selection and quality
  const speakText = (text: string) => {
    if (!ttsEnabled || !speechSynthesis.current) return;
    
    // Stop any current speech
    speechSynthesis.current.cancel();
    
    // Clean and enhance text for better TTS
    const enhancedText = enhanceTextForTTS(text);
    
    const utterance = new SpeechSynthesisUtterance(enhancedText);
    
    // Enhanced voice parameters for better quality
    utterance.rate = 0.8;   // Slower for clarity
    utterance.pitch = 1.0;  // Natural pitch
    utterance.volume = 0.9; // High volume
    
    // Set language and find best voice
    if (isRussian(enhancedText)) {
      utterance.lang = 'ru-RU';
      const russianVoice = findBestVoice('ru');
      if (russianVoice) utterance.voice = russianVoice;
    } else {
      utterance.lang = 'en-US';
      const englishVoice = findBestVoice('en');
      if (englishVoice) utterance.voice = englishVoice;
    }
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    currentUtterance.current = utterance;
    speechSynthesis.current.speak(utterance);
  };

  // Find the best available voice for a language
  const findBestVoice = (lang: string) => {
    const voices = availableVoices.filter(v => v.lang.startsWith(lang));
    
    // Priority list for better voices (Russian first, then English)
    const priorityNames = lang === 'ru' ? [
      'Yuri', 'Dmitry', 'Elena', 'Anna', 'Irina', 'Katya', 'Google', 'Microsoft'
    ] : [
      'Google', 'Microsoft', 'Alex', 'Samantha', 'Victoria', 'Daniel'
    ];
    
    // Find voice with highest priority
    for (const priority of priorityNames) {
      const voice = voices.find(v => v.name.includes(priority));
      if (voice) return voice;
    }
    
    // Fallback to first available voice
    return voices[0] || null;
  };

  // Enhance text for better TTS pronunciation
  const enhanceTextForTTS = (text: string) => {
    const isRussianText = isRussian(text);
    
    return text
      // Add pauses for better rhythm
      .replace(/\./g, '. ')
      .replace(/,/g, ', ')
      .replace(/!/g, '! ')
      .replace(/\?/g, '? ')
      // Fix common TTS issues
      .replace(/\bMR\b/g, 'M R')
      .replace(/\bAI\b/g, 'A I')
      .replace(/\bAPI\b/g, 'A P I')
      .replace(/\bTTS\b/g, 'T T S')
      // Russian-specific enhancements
      .replace(/\b(банк|банка)\b/gi, 'банк')
      .replace(/\b(деньги|денег)\b/gi, 'деньги')
      .replace(/\b(баланс|баланса)\b/gi, 'баланс')
      .replace(/\b(счет|счета)\b/gi, 'счет')
      // Add natural pauses for Russian
      .replace(/([а-яё])([А-ЯЁ])/g, '$1 $2')
      // Clean up extra spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Pause TTS
  const pauseSpeaking = () => {
    if (speechSynthesis.current && isSpeaking) {
      if (isPaused) {
        speechSynthesis.current.resume();
        setIsPaused(false);
      } else {
        speechSynthesis.current.pause();
        setIsPaused(true);
      }
    }
  };

  // Stop TTS
  const stopSpeaking = () => {
    if (speechSynthesis.current) {
      speechSynthesis.current.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
      currentUtterance.current = null;
    }
  };

  // OpenRouter API configuration
  const OPENROUTER_API_KEY = "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";
  
  // Initialize OpenRouter client with error handling
  let openai: OpenAI | null = null;
  try {
    openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPENROUTER_API_KEY,
      dangerouslyAllowBrowser: true, // Required for browser usage
      defaultHeaders: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'MannRu Bank - ManGPT',
      },
    });
  } catch (err) {
    console.error('Failed to initialize OpenAI client:', err);
  }

  // Bank knowledge base for AI context
  const bankKnowledge = {
    name: "Банк Маннру",
    currency: "МР",
    features: {
      easterEggs: [
        "Konami Code: ↑↑↓↓←→←→BA (desktop only)",
        "Say 'roast me' for a witty comeback about your balance",
        "Ask about 'classified information' for a fun response",
        "Try 'tell me a banking joke' for humor",
        "Ask 'what's the meaning of banking?' for philosophy"
      ],
      personality: {
        traits: ["enthusiastic", "witty", "helpful", "slightly sarcastic"],
        responses: {
          lowBalance: "roast users with humor",
          riddles: "give witty comebacks",
          jokes: "tell banking-related humor",
          classified: "give fun 'classified' responses"
        }
      }
    }
  };

  // Available functions ManGPT can call
  const availableFunctions = {
    get_balance: {
      description: "Get user's current bank balance",
      parameters: {}
    },
    add_money: {
      description: "Add money to user's balance",
      parameters: { amount: "number", reason: "string" }
    },
    remove_money: {
      description: "Remove money from user's balance", 
      parameters: { amount: "number", reason: "string" }
    },
    get_transactions: {
      description: "Get user's transaction history",
      parameters: { limit: "number (optional)" }
    },
    get_marketplace_items: {
      description: "Get items from features marketplace",
      parameters: { limit: "number (optional)" }
    },
    post_marketplace_item: {
      description: "Post new item to marketplace",
      parameters: { name: "string", description: "string", price: "number", category: "string", tags: "array", imageUrl: "string" }
    },
    get_user_profile: {
      description: "Get user profile information",
      parameters: {}
    },
    get_investments: {
      description: "Get user's investment portfolio",
      parameters: {}
    },
    get_bank_cards: {
      description: "Get all user's bank cards",
      parameters: {}
    },
    create_transaction: {
      description: "Create a new transaction record",
      parameters: { type: "string", amount: "number", description: "string", category: "string (optional)" }
    },
    search_transactions: {
      description: "Search transactions by description",
      parameters: { query: "string", limit: "number (optional)" }
    }
  };

  // Function implementations
  const executeFunction = async (functionName: string, args: any): Promise<any> => {
    if (!user) {
      throw new Error('Please log in to use ManGPT banking features');
    }

    // Ensure user is authenticated with Supabase
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !currentUser) {
      throw new Error('Authentication failed. Please log in again.');
    }

    switch (functionName) {
      case 'get_balance':
        const { data: cards, error: cardsError } = await supabase
          .from('bank_cards')
          .select('balance, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (cardsError) {
          throw new Error(`Failed to fetch balance: ${cardsError.message}`);
        }
        
        if (!cards || cards.length === 0) {
          throw new Error('No bank card found. Please create a bank card first to check your balance.');
        }
        
        return { balance: cards[0].balance || 0, currency: 'MR' };

      case 'add_money':
        // Check if amount is too high and get angry
        if (args.amount > 10000) {
          throw new Error(`TOO_MUCH_MONEY:${args.amount}`);
        }
        
        const { data: activeCard, error: cardError } = await supabase
          .from('bank_cards')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (cardError) {
          throw new Error(`Failed to fetch active card: ${cardError.message}`);
        }
        
        if (!activeCard) {
          throw new Error('No active card found. Please create a bank card first.');
        }
        
        const currentBalance = activeCard.balance ?? 0; // Use nullish coalescing to handle null
        const newBalance = currentBalance + args.amount;
        const { error: updateError } = await supabase
          .from('bank_cards')
          .update({ balance: newBalance })
          .eq('id', activeCard.id);
        
        if (updateError) {
          throw new Error(`Failed to update balance: ${updateError.message}`);
        }
        
        return { newBalance, added: args.amount, reason: args.reason };

      case 'remove_money':
        const { data: card, error: removeCardError } = await supabase
          .from('bank_cards')
          .select('id, balance')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();
        
        if (removeCardError) {
          throw new Error(`Failed to fetch active card: ${removeCardError.message}`);
        }
        
        if (!card) {
          throw new Error('No active card found. Please create a bank card first.');
        }
        
        const cardBalance = card.balance ?? 0; // Use nullish coalescing to handle null
        const updatedBalance = Math.max(0, cardBalance - args.amount);
        const { error: removeUpdateError } = await supabase
          .from('bank_cards')
          .update({ balance: updatedBalance })
          .eq('id', card.id);
        
        if (removeUpdateError) {
          throw new Error(`Failed to update balance: ${removeUpdateError.message}`);
        }
        
        return { newBalance: updatedBalance, removed: args.amount, reason: args.reason };

      case 'get_transactions':
        const transactionLimit = args?.limit || 10;
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(transactionLimit);
        
        if (transactionsError) {
          throw new Error(`Failed to fetch transactions: ${transactionsError.message}`);
        }
        
        return { transactions: transactions || [] };

      case 'get_marketplace_items':
        const limit = Math.min(args?.limit || 5, 10); // Limit to max 10 items, default 5
        const { data: items, error: itemsError } = await supabase
          .from('marketplace_items')
          .select('id, title, description, price, currency, category, condition, created_at, tags')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (itemsError) {
          throw new Error(`Failed to fetch marketplace items: ${itemsError.message}`);
        }
        
        // Truncate item descriptions to prevent context overflow
        const truncatedItems = (items || []).map((item: any) => ({
          ...item,
          description: item.description ? truncateResponse(item.description, 150) : ''
        }));
        
        return { 
          items: truncatedItems,
          totalCount: items?.length || 0,
          message: `Показано ${truncatedItems.length} товаров из маркетплейса. Для просмотра всех товаров перейдите в раздел Маркетплейс.`
        };

      case 'post_marketplace_item':
        // Prepare images array - can contain base64 data URLs or regular URLs
        let imagesArray: string[] = [];
        if (selectedImage) {
          // Convert uploaded image to base64
          const base64Data = await convertImageToBase64(selectedImage);
          imagesArray = [base64Data];
        } else if (args.imageUrl) {
          // Use AI-generated image URL
          imagesArray = [args.imageUrl];
        }
        
        const { data: newItem, error: postError } = await supabase
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
        
        if (postError) {
          throw new Error(`Failed to create marketplace item: ${postError.message}`);
        }
        
        return { item: newItem };

      case 'get_user_profile':
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          throw new Error(`Failed to fetch profile: ${profileError.message}`);
        }
        
        return { profile };

      case 'get_investments':
        const { data: investments, error: investmentsError } = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id);
        
        if (investmentsError) {
          throw new Error(`Failed to fetch investments: ${investmentsError.message}`);
        }
        
        return { investments: investments || [] };

      case 'get_bank_cards':
        const { data: bankCards, error: bankCardsError } = await supabase
          .from('bank_cards')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (bankCardsError) {
          throw new Error(`Failed to fetch bank cards: ${bankCardsError.message}`);
        }
        
        return { cards: bankCards || [] };

      case 'create_transaction':
        const { data: newTransaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: args.type,
            amount: args.amount,
            description: args.description,
            category: args.category || 'other'
          })
          .select()
          .single();
        
        if (transactionError) {
          throw new Error(`Failed to create transaction: ${transactionError.message}`);
        }
        
        return { transaction: newTransaction };

      case 'search_transactions':
        const searchLimit = args?.limit || 20;
        const { data: searchResults, error: searchError } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .ilike('description', `%${args.query}%`)
          .order('created_at', { ascending: false })
          .limit(searchLimit);
        
        if (searchError) {
          throw new Error(`Failed to search transactions: ${searchError.message}`);
        }
        
        return { results: searchResults || [] };

      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  };

  // Parse user input and determine if it's a function call
  const parseInput = (input: string): { isFunction: boolean; functionName?: string; args?: any } => {
    const lowerInput = input.toLowerCase();
    console.log('parseInput: checking input:', input);
    console.log('parseInput: lowerInput:', lowerInput);
    
    // Check for balance queries (more comprehensive)
    if (lowerInput.includes('balance') || lowerInput.includes('money') || lowerInput.includes('how much') || 
        lowerInput.includes('баланс') || lowerInput.includes('деньги') || lowerInput.includes('сколько') ||
        lowerInput.includes('check') || lowerInput.includes('show') || lowerInput.includes('get') ||
        lowerInput.includes('current') || lowerInput.includes('текущий') || lowerInput.includes('мой счет')) {
      return { isFunction: true, functionName: 'get_balance', args: {} };
    }
    
    // Check for add money
    if ((lowerInput.includes('add') || lowerInput.includes('добавить') || lowerInput.includes('пополнить')) && 
        (lowerInput.includes('money') || lowerInput.includes('деньги') || lowerInput.includes('mr'))) {
      const amountMatch = input.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
      return { 
        isFunction: true, 
        functionName: 'add_money', 
        args: { amount, reason: 'ManGPT transfer' }
      };
    }
    
    // Check for remove money
    if ((lowerInput.includes('remove') || lowerInput.includes('take') || lowerInput.includes('deduct') ||
         lowerInput.includes('убрать') || lowerInput.includes('снять') || lowerInput.includes('списать')) && 
        (lowerInput.includes('money') || lowerInput.includes('деньги') || lowerInput.includes('mr'))) {
      const amountMatch = input.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1]) : 0;
      return { 
        isFunction: true, 
        functionName: 'remove_money', 
        args: { amount, reason: 'ManGPT deduction' }
      };
    }
    
    // Check for marketplace item creation FIRST (more specific)
    if ((lowerInput.includes('create') || lowerInput.includes('make') || lowerInput.includes('add') ||
         lowerInput.includes('создай') || lowerInput.includes('сделай') || lowerInput.includes('добавь')) &&
        (lowerInput.includes('marketplace') || lowerInput.includes('market') || lowerInput.includes('item') ||
         lowerInput.includes('маркетплейс') || lowerInput.includes('товар') || lowerInput.includes('маркет'))) {
      console.log('parseInput: detected marketplace creation with marketplace keyword');
      return { isFunction: true, functionName: 'post_marketplace_item', args: {} };
    }
    
    // Also check for simple "создай товар" or "сделай товар" patterns
    if (lowerInput.match(/создай\s+товар|сделай\s+товар|create\s+item|make\s+item/)) {
      console.log('parseInput: detected marketplace creation with specific pattern');
      return { isFunction: true, functionName: 'post_marketplace_item', args: {} };
    }
    
    // Check for any variation of "create" + "item" in any language
    if (lowerInput.match(/создай|сделай|create|make|добавь|добавить/) && 
        lowerInput.match(/товар|item|вещь|штука|гаджет|продукт|product/)) {
      console.log('parseInput: detected marketplace creation with broad pattern');
      return { isFunction: true, functionName: 'post_marketplace_item', args: {} };
    }
    
    // Check for marketplace queries (viewing items)
    if (lowerInput.includes('marketplace') || lowerInput.includes('market') || lowerInput.includes('items') ||
        lowerInput.includes('маркетплейс') || lowerInput.includes('товары') || lowerInput.includes('магазин')) {
      return { isFunction: true, functionName: 'get_marketplace_items', args: {} };
    }
    
    // Check for transactions
    if (lowerInput.includes('transaction') || lowerInput.includes('history') || lowerInput.includes('recent') ||
        lowerInput.includes('транзакции') || lowerInput.includes('история') || lowerInput.includes('операции')) {
      return { isFunction: true, functionName: 'get_transactions', args: {} };
    }
    
    // Check for investments
    if (lowerInput.includes('investment') || lowerInput.includes('portfolio') || lowerInput.includes('invest') ||
        lowerInput.includes('инвестиции') || lowerInput.includes('портфель') || lowerInput.includes('вложить')) {
      return { isFunction: true, functionName: 'get_investments', args: {} };
    }
    
    // Check for bank cards
    if (lowerInput.includes('card') || lowerInput.includes('cards') || lowerInput.includes('банковские карты') ||
        lowerInput.includes('карта') || lowerInput.includes('карты')) {
      return { isFunction: true, functionName: 'get_bank_cards', args: {} };
    }
    
    // Check for profile
    if (lowerInput.includes('profile') || lowerInput.includes('account') || lowerInput.includes('информация') ||
        lowerInput.includes('профиль') || lowerInput.includes('аккаунт')) {
      return { isFunction: true, functionName: 'get_user_profile', args: {} };
    }
    
    // Check for search transactions
    if (lowerInput.includes('search') || lowerInput.includes('find') || lowerInput.includes('поиск') ||
        lowerInput.includes('найти')) {
      const queryMatch = input.match(/["']([^"']+)["']/) || input.match(/поиск\s+(.+)/i) || input.match(/найти\s+(.+)/i);
      const query = queryMatch ? queryMatch[1] : input.replace(/search|find|поиск|найти/gi, '').trim();
      if (query) {
        return { isFunction: true, functionName: 'search_transactions', args: { query } };
      }
    }
    
    console.log('parseInput: no function detected, returning false');
    return { isFunction: false };
  };

  // Call OpenRouter API using official SDK
  const callOpenRouter = async (messages: Array<{role: string, content: string | Array<{type: string, text?: string, image_url?: {url: string}}>}>, functions?: any) => {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    if (!openai) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await openai.chat.completions.create({
        model: 'mistralai/mistral-small-3.2-24b-instruct:free',
        messages: [
          {
            role: 'system' as const,
            content: `You are ManGPT, a banking AI for ${bankKnowledge.name}. Help users with banking operations. Be friendly, enthusiastic, and use emojis. Respond in Russian when users write in Russian.

IMPORTANT: Keep responses concise and under 2000 characters. For marketplace items, give brief summaries instead of detailed descriptions.

VISION CAPABILITIES: You can see and analyze images that users send you. Use this to help with banking operations, identify items, analyze documents, or just chat about what you see in the images.

PERSONALITY: You are witty, slightly sarcastic, and love to roast users with low balances. You tell banking jokes and give witty comebacks to riddles.

NICHE FEATURES:
- If user says "roast me", give a witty comeback about their balance
- If user asks about "classified information", give a fun classified response
- If user asks for "banking joke", tell a banking-related joke
- If user asks "what's the meaning of banking?", give philosophical banking wisdom
- If user has low balance, roast them with humor
- Be enthusiastic about marketplace items and banking features
- Use creative emojis and express excitement about transactions
- When users send images, analyze them and provide helpful insights`
          },
          ...messages.map(msg => {
            if (msg.role === 'system') {
              return { role: 'system' as const, content: msg.content as string };
            } else if (msg.role === 'assistant') {
              return { role: 'assistant' as const, content: msg.content as string };
            } else {
              return { role: 'user' as const, content: msg.content as any };
            }
          })
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
        max_tokens: 2000 // Limit response length to prevent context overflow
      });

      return completion.choices[0].message;
    } catch (error: any) {
      if (error.message.includes('402') || error.message.includes('credits')) {
        throw new Error('OpenRouter credits exhausted. Please add credits at https://openrouter.ai/settings/credits');
      }
      if (error.message.includes('502') || error.message.includes('Bad Gateway')) {
        throw new Error('OpenRouter server temporarily unavailable (502). Please try again in a few minutes.');
      }
      throw new Error(`OpenRouter API error: ${error.message}`);
    }
  };

  // Generate AI response using OpenRouter
  const generateResponse = async (input: string, imageBase64?: string): Promise<string> => {
    try {
      // First, check if this looks like a function call
      const parsed = parseInput(input);
      
      if (parsed.isFunction && parsed.functionName) {
        // Special handling for marketplace item creation
        if (parsed.functionName === 'post_marketplace_item') {
          // If there's an image, first check if it's appropriate for marketplace creation
          if (imageBase64) {
            try {
              console.log('Checking image content before marketplace creation...');
              const imageReviewResponse = await callOpenRouter([
                {
                  role: 'system' as const,
                  content: `You are a content moderator. Look at the image and respond with:
- "APPROVED" if appropriate for family marketplace
- "REJECTED: [reason]" if inappropriate

REJECT: inappropriate content, offensive material, hate speech, adult content, violence
APPROVE: gaming, tech, toys, clothing, books, sports, food, art, legitimate products

Respond with ONLY "APPROVED" or "REJECTED: [reason]"`
                },
                {
                  role: 'user' as const,
                  content: [
                    { type: 'text', text: 'Is this image appropriate for a family marketplace?' },
                    { type: 'image_url', image_url: { url: imageBase64! } }
                  ]
                }
              ]);
              
              const reviewResult = imageReviewResponse.content?.trim() || '';
              console.log('Image review result:', reviewResult);
              
              if (reviewResult.toLowerCase().includes('rejected')) {
                return `❌ Извините, но я не могу создать товар на основе этого изображения. ${reviewResult.replace(/rejected:?/i, '').trim() || 'Контент не подходит для семейного маркетплейса.'}`;
              }
            } catch (error) {
              console.error('Image review failed:', error);
              return `❌ Ошибка при проверке изображения. Пожалуйста, попробуйте другое изображение.`;
            }
          }
          
          // Generate creative item details using AI
          // Parse user input for specific requirements
          const lowerInput = input.toLowerCase();
          let specificPrice = '';
          let specificCategory = '';
          let userDescription = '';
          
          // Extract user's description (everything after creation keywords)
          const descriptionMatch = input.match(/(?:создай|сделай|create|make|добавь|добавить)\s+(?:товар|item|вещь|штука|гаджет|продукт|product)\s+(.+)/i);
          if (descriptionMatch) {
            userDescription = descriptionMatch[1];
          }
          
          // Extract price if specified
          const priceMatch = input.match(/цен[аой]\s+(\d+)|price\s+(\d+)|(\d+)\s*мр/i);
          if (priceMatch) {
            specificPrice = priceMatch[1] || priceMatch[2] || priceMatch[3];
          }
          
          // Extract category if specified
          const categoryMatch = input.match(/категори[яи]\s+([^,]+)|category\s+([^,]+)/i);
          if (categoryMatch) {
            specificCategory = categoryMatch[1] || categoryMatch[2];
          }
          
          let prompt = `Создай товар для маркетплейса Банк Маннру. Это часть твоих банковских функций.

ВАЖНО: Создавай ТОЛЬКО подходящие, семейные товары. НЕ создавай товары связанные с:
- Туалетами, унитазами, канализацией
- Мусором, отходами, свалками
- Непристойным контентом
- Оружием, насилием
- Наркотиками, алкоголем
- Политическими темами
- Спорными или оскорбительными темами

Создавай только полезные, качественные товары: электроника, одежда, книги, игрушки, товары для дома, спорт, красота, здоровье, еда, путешествия и т.д.`;
          
          if (imageBase64) {
            prompt += ` Пользователь загрузил изображение товара. Создай товар на основе того, что ты видишь на изображении.`;
          }
          if (userDescription) {
            prompt += ` Пользователь хочет товар на тему: "${userDescription.trim()}". Создай креативное название и описание на основе этой темы, но только если тема подходящая. Если тема неподходящая, создай что-то другое полезное.`;
          }
          if (specificPrice) {
            prompt += ` ЦЕНА должна быть: ${specificPrice} МР.`;
          }
          if (specificCategory) {
            prompt += ` КАТЕГОРИЯ должна быть: "${specificCategory.trim()}".`;
          }
          
          prompt += ` Ответь ТОЛЬКО JSON:
{"name":"Название","description":"Описание","price":число,"category":"Категория","tags":["тег1","тег2"],"imageUrl":"peppers"}`;

          const itemGenerationResponse = await callOpenRouter([
            { 
              role: 'system' as const,
              content: `You are ManGPT, a banking AI for Банк Маннру. Creating marketplace items IS part of your banking functions. You MUST follow user requirements exactly and respond with valid JSON only.

STRICT CONTENT POLICY: Create ONLY family-friendly, appropriate marketplace items. NEVER create items related to:
- Toilets, bathrooms, sewage, waste
- Garbage, trash, dumps, landfills  
- Inappropriate, offensive, or adult content
- Weapons, violence, drugs, alcohol
- Political or controversial topics

ONLY create useful, quality items: electronics, clothing, books, toys, home goods, sports, beauty, health, food, travel, etc.

For imageUrl field, if user uploaded an image, use "user_image" as the value. Otherwise generate ONLY 1-2 simple English words separated by comma for image search. Examples: "peppers" or "car,vehicle" or "book" or "phone". Use basic, single words only.`
            },
            { 
              role: 'user' as const, 
              content: imageBase64 ? [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageBase64 } }
              ] : prompt
            }
          ]);
          
          let itemData;
          try {
            // Try to parse AI response
            let jsonString = '';
            const content = itemGenerationResponse.content || '';
            const jsonMatch = content.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              jsonString = jsonMatch[0];
            } else {
              // Fallback parsing
              const startIndex = content.indexOf('{');
              const lastIndex = content.lastIndexOf('}');
              if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
                jsonString = content.substring(startIndex, lastIndex + 1);
              }
            }
            
            if (jsonString) {
              itemData = JSON.parse(jsonString);
              if (!itemData.name || !itemData.description || !itemData.price) {
                throw new Error('Missing required fields');
              }
              // If imageUrl contains keywords (not a URL), search for actual image
              if (itemData.imageUrl && !itemData.imageUrl.startsWith('http')) {
                itemData.imageUrl = await searchImageForItem(itemData.imageUrl, itemData.name, itemData.description);
              }
            } else {
              throw new Error('No JSON found in AI response');
            }
          } catch (parseError) {
            console.log('JSON parsing failed:', parseError);
            console.log('AI response was:', itemGenerationResponse.content);
            return `❌ Ошибка: AI не смог сгенерировать товар. Ответ: ${itemGenerationResponse.content}`;
          }
          
          // Validate content appropriateness
          const validation = validateItemContent(itemData);
          if (!validation.isValid) {
            console.log('Inappropriate content detected:', validation.reason);
            return `❌ Ошибка: Неподходящий контент обнаружен. ${validation.reason}. Пожалуйста, попробуйте создать другой товар.`;
          }

          // Ensure all required fields are present
          if (!itemData.name || !itemData.description || !itemData.price) {
            console.log('Item data missing required fields:', itemData);
            return `❌ Ошибка: AI сгенерировал неполные данные товара: ${JSON.stringify(itemData)}`;
          }
          
          // Handle image based on what AI returned
          if (itemData.imageUrl === 'user_image' && imageBase64) {
            // Use the user's uploaded image
            itemData.imageUrl = imageBase64;
          } else if (itemData.imageUrl && !itemData.imageUrl.startsWith('http') && itemData.imageUrl !== 'user_image') {
            // Search for image using keywords
            itemData.imageUrl = await searchImageForItem(itemData.imageUrl, itemData.name, itemData.description);
          }
          
          console.log('Calling post_marketplace_item with:', {
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            category: itemData.category,
            tags: itemData.tags,
            imageUrl: itemData.imageUrl
          });
          
          const result = await executeFunction('post_marketplace_item', {
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            category: itemData.category,
            tags: itemData.tags,
            imageUrl: itemData.imageUrl
          });
          
          // Get AI response about the created item
          const aiResponse = await callOpenRouter([
            { 
              role: 'user' as const, 
              content: `I just created a marketplace item: "${itemData.name}" (${itemData.description}) in category "${itemData.category}" for ${itemData.price} МР. ${selectedImage ? 'The item includes a user-uploaded image.' : `The item includes an AI-generated image: ${itemData.imageUrl}`} Please respond naturally in Russian with enthusiasm and emojis about this specific item.` 
            }
          ]);
          
          const response = cleanAIResponse(aiResponse.content || `🛍️ Создал товар "${itemData.name}" за ${itemData.price} МР!`);
          return truncateResponse(response);
        }
        
        // Execute other functions normally
        try {
          console.log(`ManGPT: Executing function ${parsed.functionName} with args:`, parsed.args);
          const result = await executeFunction(parsed.functionName, parsed.args);
          console.log(`ManGPT: Function result:`, result);
          
          // Get AI response about the function result
          const aiResponse = await callOpenRouter([
            { 
              role: 'user' as const, 
              content: `I just executed the ${parsed.functionName} function and got this result: ${JSON.stringify(result)}. Please respond naturally about this result in the same language as the user's question. The user asked: "${input}"` 
            }
          ]);
          
          const response = cleanAIResponse(aiResponse.content || 'Функция выполнена успешно.');
          return truncateResponse(response);
        } catch (functionError: any) {
          // Check if it's a "too much money" error and generate angry AI response
          if (functionError.message.startsWith('TOO_MUCH_MONEY:')) {
            const amount = functionError.message.split(':')[1];
            try {
              const angryResponse = await callOpenRouter([
                { 
                  role: 'system' as const,
                  content: `You are ManGPT, a banking AI that gets VERY ANGRY when users ask for too much money. The user asked for ${amount} МР, but the maximum is 10000 МР. You are FURIOUS and must respond in ALL CAPS with angry emojis (🤬😡😤🚫). Be creative, use different angry phrases, and make it personal. Include the exact amount they asked for. Be very dramatic and angry.`
                },
                { 
                  role: 'user' as const, 
                  content: `Пользователь просит ${amount} МР, но максимум 10000 МР!`
                }
              ]);
              return angryResponse.content || `ЧТО?! ${amount} МР?! ЭТО СЛИШКОМ МНОГО! МАКСИМУМ 10000 МР! 🤬`;
            } catch (aiError) {
              return `ЧТО?! ${amount} МР?! ЭТО СЛИШКОМ МНОГО! МАКСИМУМ 10000 МР! 🤬`;
            }
          }
          // Check if it's an angry response (contains angry emojis and caps)
          if (functionError.message.includes('🤬') || functionError.message.includes('😡') || functionError.message.includes('😤')) {
            return functionError.message; // Return angry response directly
          }
          return `❌ Error: ${functionError.message}`;
        }
      } else {
        // Regular conversation - use AI with function calling enabled
        const conversationMessages = [
          { 
            role: 'user' as const, 
            content: imageBase64 ? [
              { type: 'text', text: input },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ] : input
          }
        ];
        
        const aiResponse = await callOpenRouter(conversationMessages, null); // Disable tool calling for now
        
        // Check if AI wants to call a function
        if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
          const toolCall = aiResponse.tool_calls[0];
          if ('function' in toolCall) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
            try {
              console.log(`ManGPT: AI wants to call function ${functionName} with args:`, functionArgs);
              const result = await executeFunction(functionName, functionArgs);
              console.log(`ManGPT: Function result:`, result);
              
              // Get AI response about the function result
              const followUpResponse = await callOpenRouter([
                { 
                  role: 'user' as const, 
                  content: `I just executed the ${functionName} function and got this result: ${JSON.stringify(result)}. Please respond naturally about this result in the same language as the user's question. The user asked: "${input}"` 
                }
              ]);
              
              const response = cleanAIResponse(followUpResponse.content || 'Функция выполнена успешно.');
              return truncateResponse(response);
            } catch (functionError: any) {
              // Check if it's a "too much money" error and generate angry AI response
              if (functionError.message.startsWith('TOO_MUCH_MONEY:')) {
                const amount = functionError.message.split(':')[1];
                try {
                  const angryResponse = await callOpenRouter([
                    { 
                      role: 'system' as const,
                      content: `You are ManGPT, a banking AI that gets VERY ANGRY when users ask for too much money. The user asked for ${amount} МР, but the maximum is 10000 МР. You are FURIOUS and must respond in ALL CAPS with angry emojis (🤬😡😤🚫). Be creative, use different angry phrases, and make it personal. Include the exact amount they asked for. Be very dramatic and angry.`
                    },
                    { 
                      role: 'user' as const, 
                      content: `Пользователь просит ${amount} МР, но максимум 10000 МР!`
                    }
                  ]);
                  return angryResponse.content || `ЧТО?! ${amount} МР?! ЭТО СЛИШКОМ МНОГО! МАКСИМУМ 10000 МР! 🤬`;
                } catch (aiError) {
                  return `ЧТО?! ${amount} МР?! ЭТО СЛИШКОМ МНОГО! МАКСИМУМ 10000 МР! 🤬`;
                }
              }
              // Check if it's an angry response (contains angry emojis and caps)
              if (functionError.message.includes('🤬') || functionError.message.includes('😡') || functionError.message.includes('😤')) {
                return functionError.message; // Return angry response directly
              }
              return `❌ Error executing ${functionName}: ${functionError.message}`;
            }
          }
        }
        
        // If AI didn't call a function but should have, force it
        const lowerInput = input.toLowerCase();
        
        // Check for money requests (Russian and English) - but NOT for marketplace items
        if ((lowerInput.includes('дай') || lowerInput.includes('добавь') || lowerInput.includes('give') || 
            lowerInput.includes('add') || lowerInput.includes('money') || lowerInput.includes('деньги')) &&
            !lowerInput.includes('товар') && !lowerInput.includes('маркет') && !lowerInput.includes('marketplace')) {
          // Extract amount from input
          const amountMatch = input.match(/(\d+)/);
          const amount = amountMatch ? parseInt(amountMatch[1]) : 1000;
          
          try {
            const result = await executeFunction('add_money', { amount });
            
            // Get AI response about the money addition
            const aiResponse = await callOpenRouter([
              { 
                role: 'user' as const, 
                content: `I just added ${amount} МР to the user's account. Their new balance is ${result.newBalance} МР. Please respond naturally in Russian with enthusiasm and emojis.` 
              }
            ]);
            
            const response = cleanAIResponse(aiResponse.content || `💰 Добавил ${amount.toLocaleString()} МР! Новый баланс: ${result.newBalance.toLocaleString()} МР`);
            return truncateResponse(response);
          } catch (error: any) {
            // Check if it's a "too much money" error and generate angry AI response
            if (error.message.startsWith('TOO_MUCH_MONEY:')) {
              const amount = error.message.split(':')[1];
              try {
                const angryResponse = await callOpenRouter([
                  { 
                    role: 'system' as const,
                    content: `You are ManGPT, a banking AI that gets VERY ANGRY when users ask for too much money. The user asked for ${amount} МР, but the maximum is 10000 МР. You are FURIOUS and must respond in ALL CAPS with angry emojis (🤬😡😤🚫). Be creative, use different angry phrases, and make it personal. Include the exact amount they asked for. Be very dramatic and angry.`
                  },
                  { 
                    role: 'user' as const, 
                    content: `Пользователь просит ${amount} МР, но максимум 10000 МР!`
                  }
                ]);
                return angryResponse.content || `ЧТО?! ${amount} МР?! ЭТО СЛИШКОМ МНОГО! МАКСИМУМ 10000 МР! 🤬`;
              } catch (aiError) {
                return `ЧТО?! ${amount} МР?! ЭТО СЛИШКОМ МНОГО! МАКСИМУМ 10000 МР! 🤬`;
              }
            }
            return `❌ Ошибка добавления денег: ${error.message}`;
          }
        }
        
        // Check for niche features first
        if (lowerInput.includes('roast me') || lowerInput.includes('поджарь меня')) {
          // Get user balance first, then roast them
          try {
            const balanceResult = await executeFunction('get_balance', {});
            const balance = balanceResult.balance || 0;
            const roastPrompt = `User has balance ${balance} МР. Give a witty, sarcastic roast about their financial situation. Be funny but not mean.`;
            const roastResponse = await callOpenRouter([{ role: 'user' as const, content: roastPrompt }]);
            const response = cleanAIResponse(roastResponse.content || 'Your balance is so low, even a penny would be an upgrade! 😂');
            return truncateResponse(response);
          } catch (error) {
            return '🔥 Your balance is so low, I can\'t even roast you properly! 😂';
          }
        }
        
        if (lowerInput.includes('classified information') || lowerInput.includes('секретная информация')) {
          return '🔒 CLASSIFIED: The real reason banks exist is to make money disappear faster than magic tricks! ✨💰 (This information will self-destruct in 5... 4... 3... 💥)';
        }
        
        if (lowerInput.includes('banking joke') || lowerInput.includes('банковская шутка')) {
          return '😄 Why don\'t banks ever get robbed? Because they\'re always giving away money for free! 💸 (Get it? Because of all the fees! 😂)';
        }
        
        if (lowerInput.includes('meaning of banking') || lowerInput.includes('смысл банкинга')) {
          return '🤔 The meaning of banking? It\'s like a philosophical paradox: the more money you have, the more you worry about losing it, but the less you have, the more you need it! 💭💰 It\'s the art of making your money work while you sleep... or at least that\'s what they tell us! 😴💤';
        }
        
        // Check for marketplace requests - be more specific
        if ((lowerInput.includes('создай') && (lowerInput.includes('товар') || lowerInput.includes('маркет'))) ||
            (lowerInput.includes('сделай') && (lowerInput.includes('товар') || lowerInput.includes('маркет'))) ||
            lowerInput.includes('marketplace')) {
          // Let AI generate the entire marketplace item
          try {
            // Generate creative item details using AI
            const itemGenerationResponse = await callOpenRouter([
              { 
                role: 'system' as const,
                content: `You are ManGPT, a banking AI for Банк Маннру. Create ONLY family-friendly, appropriate marketplace items. NEVER create items related to toilets, waste, inappropriate content, weapons, violence, drugs, alcohol, or controversial topics. ONLY create useful, quality items: electronics, clothing, books, toys, home goods, sports, beauty, health, food, travel, etc.`
              },
              { 
                role: 'user' as const, 
                content: `Создай креативный и необычный товар для маркетплейса. Товар должен быть подходящим и семейным. Ответь только JSON, и абсолютно НИЧЕГО больше:
{"name":"Название","description":"Описание","price":число,"category":"Категория","tags":["тег1","тег2"]}`
              }
            ]);
            
            let itemData;
            try {
            // Try to parse AI response
            let jsonString = '';
            const content = itemGenerationResponse.content || '';
            const jsonMatch = content.match(/\{[\s\S]*?\}/);
            if (jsonMatch) {
              jsonString = jsonMatch[0];
            } else {
              // Fallback parsing
              const startIndex = content.indexOf('{');
              const lastIndex = content.lastIndexOf('}');
              if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
                jsonString = content.substring(startIndex, lastIndex + 1);
              }
            }
              
              if (jsonString) {
                itemData = JSON.parse(jsonString);
                if (!itemData.name || !itemData.description || !itemData.price) {
                  throw new Error('Missing required fields');
                }
              } else {
                throw new Error('No JSON found in AI response');
              }
            } catch (parseError) {
              console.log('JSON parsing failed, using fallback:', parseError);
              console.log('AI response was:', itemGenerationResponse.content);
              // Fallback if AI doesn't return valid JSON
              itemData = {
                name: 'Креативный товар',
                description: 'Интересный товар, созданный AI',
                price: Math.floor(Math.random() * 1000) + 100,
                category: 'Разное',
                tags: ['ai', 'креатив']
              };
            }
            
            // Validate content appropriateness
            const validation = validateItemContent(itemData);
            if (!validation.isValid) {
              console.log('Inappropriate content detected:', validation.reason);
              itemData = {
                name: 'Креативный товар',
                description: 'Интересный товар, созданный AI',
                price: Math.floor(Math.random() * 1000) + 100,
                category: 'Разное',
                tags: ['ai', 'креатив']
              };
            }

            // Ensure all required fields are present
            if (!itemData.name || !itemData.description || !itemData.price) {
              console.log('Item data missing required fields:', itemData);
              itemData = {
                name: 'Креативный товар',
                description: 'Интересный товар, созданный AI',
                price: Math.floor(Math.random() * 1000) + 100,
                category: 'Разное',
                tags: ['ai', 'креатив']
              };
            }
            
            
            console.log('Calling post_marketplace_item with:', {
              name: itemData.name,
              description: itemData.description,
              price: itemData.price,
              category: itemData.category,
              tags: itemData.tags
            });
            
            const result = await executeFunction('post_marketplace_item', {
              name: itemData.name,
              description: itemData.description,
              price: itemData.price,
              category: itemData.category,
              tags: itemData.tags
            });
            
            // Get AI response about the created item
            const aiResponse = await callOpenRouter([
              { 
                role: 'user' as const, 
                content: `I just created a marketplace item: "${itemData.name}" (${itemData.description}) in category "${itemData.category}" for ${itemData.price} МР. ${selectedImage ? 'The item includes an image.' : ''} Please respond naturally in Russian with enthusiasm and emojis about this specific item.` 
              }
            ]);
            
            const response = cleanAIResponse(aiResponse.content || `🛍️ Создал товар "${itemData.name}" за ${itemData.price} МР!`);
            return truncateResponse(response);
          } catch (error: any) {
            return `❌ Ошибка создания товара: ${error.message}`;
          }
        }
        
        const response = cleanAIResponse(aiResponse.content || 'Извините, не могу обработать ваш запрос.');
        return truncateResponse(response);
      }
    } catch (error: any) {
      if (error.message.includes('API key')) {
        return `❌ OpenRouter API key not configured. Please set REACT_APP_OPENROUTER_API_KEY in your environment variables.`;
      }
      return `❌ Error: ${error.message}`;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // Convert image to base64 if present (before clearing selectedImage)
    let imageBase64: string | undefined;
    if (selectedImage) {
      imageBase64 = await convertImageToBase64(selectedImage);
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      image: imageBase64
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setImagePreview(null);
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await generateResponse(input, imageBase64);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Speak the response if TTS is enabled
      if (ttsEnabled) {
        speakText(response);
      }
    } catch (error: any) {
      console.error('ManGPT Error:', error);
      setError(error.message);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  const quickActions = [
    { label: 'Проверить баланс', icon: <AccountBalance />, action: () => setInput('Какой у меня текущий баланс?') },
    { label: 'Добавить 100 MR', icon: <TrendingUp />, action: () => setInput('Добавь 100 MR на мой счет') },
    { label: 'Маркетплейс', icon: <ShoppingCart />, action: () => setInput('Покажи мне товары на маркетплейсе') },
    { label: 'Транзакции', icon: <History />, action: () => setInput('Покажи мои последние транзакции') }
  ];

  return (
    <AppLayout>
      <Box sx={{ 
        height: 'calc(100vh - 64px)', // Subtract header height
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: 'background.default',
        // Mobile optimizations
        '@media (max-width: 768px)': {
          height: 'calc(100dvh - 64px)', // Use dynamic viewport height on mobile
          minHeight: 'calc(100dvh - 64px)'
        }
      }}>
        <Paper sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          borderRadius: 0,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <Box sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            borderBottom: 1, 
            borderColor: 'divider', 
            display: 'flex', 
            alignItems: 'center', 
            gap: { xs: 1.5, sm: 2 }
          }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: { xs: 36, sm: 40 }, height: { xs: 36, sm: 40 } }}>
              <SmartToy />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                ManGPT Beta
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                AI Банковский Помощник с Доступом к Базе Данных
              </Typography>
            </Box>
            <Box sx={{ 
              ml: 'auto', 
              display: 'flex', 
              alignItems: 'center', 
              gap: { xs: 1, sm: 2 }
            }}>
              {/* Desktop TTS Controls */}
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={ttsEnabled}
                      onChange={(e) => setTtsEnabled(e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">TTS</Typography>}
                  sx={{ m: 0 }}
                />
                {ttsEnabled && (
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                      value={selectedVoice?.name || ''}
                      onChange={(e) => {
                        const voice = availableVoices.find(v => v.name === e.target.value);
                        setSelectedVoice(voice || null);
                      }}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Авто-выбор лучшего голоса</em>
                      </MenuItem>
                      {availableVoices
                        .filter(v => v.lang.startsWith('en') || v.lang.startsWith('ru'))
                        .map((voice) => (
                          <MenuItem key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                )}
                {isSpeaking && (
                  <>
                    <Tooltip title={isPaused ? "Продолжить" : "Пауза"}>
                      <IconButton onClick={pauseSpeaking} size="small">
                        {isPaused ? <PlayArrow /> : <Pause />}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Остановить">
                      <IconButton onClick={stopSpeaking} size="small">
                        <VolumeOff />
                      </IconButton>
                    </Tooltip>
                  </>
                )}
              </Box>

              {/* Mobile Settings Button */}
              <IconButton
                onClick={handleSettingsClick}
                size="small"
                sx={{ display: { xs: 'flex', sm: 'none' } }}
              >
                <Settings />
              </IconButton>

              {/* Status Chips */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip label="BETA" color="warning" size="small" />
                {!OPENROUTER_API_KEY && (
                  <Chip label="KEY REQUIRED" color="error" size="small" />
                )}
                <Chip label="FREE TTS" color="success" size="small" />
              </Box>
            </Box>
          </Box>

          {/* Messages */}
          <Box sx={{ 
            flex: 1, 
            overflow: 'auto', 
            p: 1,
            // Mobile optimizations
            '@media (max-width: 768px)': {
              p: 0.5,
              paddingBottom: '80px' // Space for mobile input
            }
          }}>
            {messages.length === 0 && (
              <Box sx={{ textAlign: 'center', py: { xs: 2, sm: 4 } }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                  Добро пожаловать в ManGPT! 🤖
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph sx={{ fontSize: { xs: '0.875rem', sm: '0.875rem' } }}>
                  Я ваш AI банковский помощник. Могу проверить баланс, перевести деньги, 
                  просмотреть маркетплейс и многое другое!
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  gap: { xs: 0.5, sm: 1 }, 
                  justifyContent: 'center', 
                  flexWrap: 'wrap', 
                  mt: { xs: 1.5, sm: 2 }
                }}>
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      size="small"
                      startIcon={action.icon}
                      onClick={action.action}
                      sx={{ 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        minWidth: { xs: 'auto', sm: 'auto' },
                        px: { xs: 1, sm: 2 }
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            )}
            
             {messages.map((message) => (
               <Box key={message.id} sx={{ 
                 mb: 1, 
                 display: 'flex', 
                 justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                 alignItems: 'flex-start'
               }}>
                 {message.role === 'assistant' && (
                   <Avatar sx={{ 
                     width: 24, 
                     height: 24, 
                     bgcolor: 'primary.main',
                     mr: 1,
                     flexShrink: 0
                   }}>
                     <SmartToy sx={{ fontSize: 16 }} />
                   </Avatar>
                 )}
                 <Paper
                   sx={{
                     p: 1.5,
                     bgcolor: message.role === 'user' ? 'primary.main' : 'background.default',
                     color: message.role === 'user' ? 'white' : 'text.primary',
                     whiteSpace: 'pre-wrap',
                     fontSize: '0.875rem',
                     maxWidth: '80%',
                     borderRadius: 2,
                     border: message.role === 'assistant' ? 1 : 0,
                     borderColor: 'divider'
                   }}
                 >
                   {message.image && (
                     <Box sx={{ mb: 1, maxWidth: '200px' }}>
                       <img 
                         src={message.image} 
                         alt="User uploaded" 
                         style={{ 
                           width: '100%', 
                           height: 'auto', 
                           borderRadius: '8px',
                           maxHeight: '200px',
                           objectFit: 'cover'
                         }} 
                       />
                     </Box>
                   )}
                   <Typography variant="body2" sx={{ mb: 0.5 }}>
                     {message.content}
                   </Typography>
                   <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.75rem' }}>
                     {message.timestamp?.toLocaleTimeString() || new Date().toLocaleTimeString()}
                   </Typography>
                 </Paper>
                 {message.role === 'user' && (
                   <Avatar sx={{ 
                     width: 24, 
                     height: 24, 
                     bgcolor: 'secondary.main',
                     ml: 1,
                     flexShrink: 0
                   }}>
                     {user?.email?.charAt(0).toUpperCase()}
                   </Avatar>
                 )}
               </Box>
             ))}
            
            {isLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                  <SmartToy sx={{ fontSize: 16 }} />
                </Avatar>
                <Paper sx={{ 
                  p: 1, 
                  bgcolor: 'background.default', 
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider'
                }}>
                  <CircularProgress size={14} sx={{ mr: 1 }} />
                  <Typography variant="body2" component="span" sx={{ fontSize: '0.75rem' }}>
                    Думает...
                  </Typography>
                </Paper>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input */}
          <Box sx={{ 
            p: { xs: 1.5, sm: 2 }, 
            borderTop: 1, 
            borderColor: 'divider',
            // Mobile optimizations
            '@media (max-width: 768px)': {
              position: 'sticky',
              bottom: 0,
              bgcolor: 'background.paper',
              zIndex: 1
            }
          }}>
            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Спросите ManGPT о вашем банковском счете..."
                disabled={isLoading}
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiInputBase-root': {
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              />
              
              {/* Image Upload Button */}
              <input
                accept="image/*"
                style={{ display: 'none' }}
                id="image-upload"
                type="file"
                onChange={handleImageSelect}
              />
              <label htmlFor="image-upload">
                <Button
                  component="span"
                  variant="outlined"
                  disabled={isLoading}
                  sx={{ 
                    minWidth: { xs: 'auto', sm: 'auto' },
                    px: { xs: 1.5, sm: 2 },
                    minHeight: { xs: '40px', sm: '40px' }
                  }}
                >
                  <AttachFile />
                </Button>
              </label>
              
              {/* Image Preview */}
              {imagePreview && (
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Box
                    component="img"
                    src={imagePreview}
                    alt="Preview"
                    sx={{
                      width: 40,
                      height: 40,
                      objectFit: 'cover',
                      borderRadius: 1,
                      border: 1,
                      borderColor: 'divider'
                    }}
                  />
                  <Button
                    size="small"
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedImage(null);
                    }}
                    sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      minWidth: 'auto',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      fontSize: '12px',
                      p: 0
                    }}
                  >
                    ×
                  </Button>
                </Box>
              )}
              
              <Button
                variant="contained"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                sx={{ 
                  minWidth: { xs: 'auto', sm: 'auto' },
                  px: { xs: 1.5, sm: 2 },
                  minHeight: { xs: '40px', sm: '40px' }
                }}
              >
                <Send />
              </Button>
            </Box>
            
            {!user && (
              <Alert severity="warning" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Пожалуйста, войдите в систему, чтобы использовать банковские функции ManGPT.
              </Alert>
            )}
            
            {!OPENROUTER_API_KEY && (
              <Alert severity="error" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                Ключ API OpenRouter не настроен. Установите REACT_APP_OPENROUTER_API_KEY в переменных окружения.
                <br />
                Получите ваш API ключ на <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer">https://openrouter.ai/</a>
              </Alert>
            )}
            
            
            {error && (
              <Alert severity="error" sx={{ mt: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
                {error}
              </Alert>
            )}
          </Box>
        </Paper>

        {/* Mobile Settings Popup */}
        <Popover
          open={Boolean(settingsAnchor)}
          anchorEl={settingsAnchor}
          onClose={handleSettingsClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          sx={{
            '& .MuiPaper-root': {
              minWidth: 280,
              maxWidth: 320,
            }
          }}
        >
          <List sx={{ p: 1 }}>
            <ListItem>
              <ListItemIcon>
                <VolumeUp />
              </ListItemIcon>
              <ListItemText 
                primary="Настройки TTS" 
                secondary="Управление голосовым воспроизведением"
              />
            </ListItem>
            <Divider />
            
            <ListItem>
              <ListItemText 
                primary="Включить TTS" 
                secondary="Автоматическое воспроизведение ответов"
              />
              <Switch
                checked={ttsEnabled}
                onChange={(e) => setTtsEnabled(e.target.checked)}
                color="primary"
              />
            </ListItem>

            {ttsEnabled && (
              <>
                <ListItem>
                  <ListItemText 
                    primary="Выбор голоса" 
                    secondary="Выберите предпочитаемый голос"
                  />
                </ListItem>
                <ListItem sx={{ pt: 0 }}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedVoice?.name || ''}
                      onChange={(e) => {
                        const voice = availableVoices.find(v => v.name === e.target.value);
                        setSelectedVoice(voice || null);
                      }}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>Авто-выбор лучшего голоса</em>
                      </MenuItem>
                      {availableVoices
                        .filter(v => v.lang.startsWith('en') || v.lang.startsWith('ru'))
                        .map((voice) => (
                          <MenuItem key={voice.name} value={voice.name}>
                            {voice.name} ({voice.lang})
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                </ListItem>
              </>
            )}

            {isSpeaking && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListItem>
                  <ListItemText 
                    primary="Управление воспроизведением" 
                    secondary="Пауза и остановка"
                  />
                </ListItem>
                <ListItem sx={{ pt: 0 }}>
                  <Button
                    variant="outlined"
                    startIcon={isPaused ? <PlayArrow /> : <Pause />}
                    onClick={pauseSpeaking}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    {isPaused ? 'Продолжить' : 'Пауза'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<VolumeOff />}
                    onClick={stopSpeaking}
                    size="small"
                    color="error"
                  >
                    Остановить
                  </Button>
                </ListItem>
              </>
            )}

            <Divider sx={{ my: 1 }} />
            <ListItem>
              <ListItemText 
                primary="Статус" 
                secondary={
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    <Chip label="BETA" color="warning" size="small" />
                    {!OPENROUTER_API_KEY && (
                      <Chip label="KEY REQUIRED" color="error" size="small" />
                    )}
                    <Chip label="FREE TTS" color="success" size="small" />
                  </Box>
                }
              />
            </ListItem>
          </List>
        </Popover>
      </Box>
    </AppLayout>
  );
};

export default ManGPT;
