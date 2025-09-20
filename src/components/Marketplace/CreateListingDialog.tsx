import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Alert,
  Card,
  CardMedia,
  InputAdornment,
} from '@mui/material'
import { Close, Add as AddIcon, CloudUpload, Delete, CreditCard, PhotoCamera, DescriptionOutlined, Flag, LabelOutlined, AutoFixHigh, Psychology, Category, LocalOffer, HourglassEmpty, AttachMoney, TrendingUp, Assessment } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthContext } from '../../contexts/AuthContext'
import { supabase } from '../../config/supabase'
import OpenAI from 'openai'

const createListingSchema = z.object({
  title: z.string().min(3, 'Название должно содержать минимум 3 символа'),
  description: z.string().min(10, 'Описание должно содержать минимум 10 символов'),
  price: z.number().min(0.01, 'Цена должна быть больше 0'),
  category: z.string().min(1, 'Выберите категорию'),
  condition: z.string().refine((val) => ['new', 'used', 'refurbished'].includes(val), {
    message: 'Выберите корректное состояние товара',
  }),
  location: z.string().min(1, 'Укажите местоположение'),
  tags: z.array(z.string()).min(1, 'Добавьте хотя бы один тег'),
  images: z.array(z.string()).optional(),
  purchase_limit_type: z.string().refine((val) => ['1', 'custom', 'infinite'].includes(val), {
    message: 'Выберите корректный тип лимита',
  }),
  purchase_limit_value: z.number().optional(),
})

type CreateListingForm = z.infer<typeof createListingSchema>

interface CreateListingDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  aiTextGenerationEnabled?: boolean
}

const categories = [
  'Электроника',
  'Одежда',
  'Книги',
  'Спорт',
  'Дом и сад',
  'Авто',
  'Красота',
  'Игрушки',
  'Другое',
]

const conditions = [
  { value: 'new', label: 'Новое' },
  { value: 'used', label: 'Б/у' },
  { value: 'refurbished', label: 'Восстановленное' },
]

// OpenRouter API configuration
const OPENROUTER_API_KEY = "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";

// Initialize OpenRouter client
let openai: OpenAI | null = null;
try {
  openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPENROUTER_API_KEY,
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      'HTTP-Referer': window.location.origin,
      'X-Title': 'MannRu Bank - Marketplace',
    },
  });
} catch (err) {
  console.error('Failed to initialize OpenAI client:', err);
}

// Content validation for marketplace items
const validateItemContent = (itemData: any): { isValid: boolean; reason?: string } => {
  if (!itemData || typeof itemData !== 'object') {
    return { isValid: false, reason: 'Invalid item data' };
  }

  const { title, description, category, tags } = itemData;
  const textToCheck = `${title || ''} ${description || ''} ${category || ''} ${(tags || []).join(' ')}`.toLowerCase();

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

// AI text review function for name and description
const reviewTextWithAI = async (text: string, fieldName: string): Promise<{ isAppropriate: boolean; reason?: string }> => {
  if (!openai || !text || text.trim().length === 0) {
    return { isAppropriate: true }; // Skip review if AI is not available or text is empty
  }

  try {
    console.log(`Starting AI text review for ${fieldName}...`);
    console.log(`Text to review: "${text}"`);
    
    const response = await openai.chat.completions.create({
      model: 'x-ai/grok-4-fast:free',
      messages: [
        {
          role: 'system',
          content: `Content moderator. Review text and respond with:
- "APPROVED" if appropriate for family marketplace
- "REJECTED: [reason]" if inappropriate

REJECT: poop, waste, nudity, violence, drugs, hate speech, offensive content
APPROVE: gaming, tech, toys, clothing, books, sports, food, art, legitimate products

Respond with ONLY "APPROVED" or "REJECTED: [reason]"`
        },
        {
          role: 'user',
          content: `Review this ${fieldName}: "${text}"`
        }
      ],
      max_tokens: 15000,
      temperature: 0.1
    });

    const result = response.choices[0]?.message?.content?.trim() || '';
    console.log(`AI text review response for ${fieldName}:`, result);
    
    const cleanResult = result.toLowerCase().trim();
    
    if (cleanResult.includes('approved') || cleanResult === 'approved') {
      console.log(`${fieldName} approved by AI`);
      return { isAppropriate: true };
    } else if (cleanResult.includes('rejected') || cleanResult.startsWith('rejected')) {
      const reason = result.replace(/rejected:?/i, '').trim();
      console.log(`${fieldName} rejected by AI:`, reason);
      return { isAppropriate: false, reason: reason || 'Inappropriate content detected' };
    } else {
      console.log(`Unclear AI response for ${fieldName}, rejecting for safety:`, result);
      return { isAppropriate: false, reason: `Unable to verify ${fieldName} content. AI said: "${result}"` };
    }
  } catch (error) {
    console.error(`AI text review failed for ${fieldName}:`, error);
    // If AI review fails, reject to be safe
    console.log(`AI text review failed for ${fieldName}, rejecting for safety`);
    return { isAppropriate: false, reason: `${fieldName} review failed - please try different text` };
  }
};

// Basic image validation (only check file size and format)
const validateImageContent = (imageBase64: string): { isAppropriate: boolean; reason?: string } => {
  // Check for very small images (might be corrupted)
  if (imageBase64.length < 100) {
    return { isAppropriate: false, reason: 'Image too small or corrupted' };
  }
  
  // Check for very large images (over 5MB limit)
  if (imageBase64.length > 5 * 1024 * 1024) { // 5MB
    return { isAppropriate: false, reason: 'Image too large (max 5MB)' };
  }
  
  // Check if it's a valid image format
  if (!imageBase64.startsWith('data:image/')) {
    return { isAppropriate: false, reason: 'Invalid image format' };
  }
  
  return { isAppropriate: true };
};

// AI image review function with Grok vision capabilities
const reviewImageWithAI = async (imageBase64: string): Promise<{ isAppropriate: boolean; reason?: string }> => {
  if (!openai) {
    return { isAppropriate: true }; // Skip review if AI is not available
  }

  // First, do basic validation
  const basicValidation = validateImageContent(imageBase64);
  if (!basicValidation.isAppropriate) {
    return basicValidation;
  }

  try {
    console.log('Starting AI image review...');
    console.log('Image base64 length:', imageBase64.length);
    console.log('Image base64 preview:', imageBase64.substring(0, 100) + '...');
    
    const response = await openai.chat.completions.create({
      model: 'x-ai/grok-4-fast:free', // Grok with vision capabilities
      messages: [
        {
          role: 'system',
          content: `Content moderator. Look at image and respond with:
- "APPROVED" if appropriate for family marketplace
- "REJECTED: [reason]" if inappropriate

REJECT: poop, waste, nudity, violence, drugs, hate speech
APPROVE: gaming, tech, toys, clothing, books, sports, food, art, legitimate products

Respond with ONLY "APPROVED" or "REJECTED: [reason]"`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Is this image appropriate? Respond "APPROVED" or "REJECTED: [reason]"'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64
              }
            }
          ]
        }
      ],
      max_tokens: 15000,
      temperature: 0.1
    });
    
    console.log('OpenAI API response received:', response);
    console.log('Response choices:', response.choices);
    console.log('First choice:', response.choices[0]);
    console.log('First choice message:', response.choices[0]?.message);

    const result = response.choices[0]?.message?.content?.trim() || '';
    console.log('Grok vision response:', result);
    console.log('Response length:', result.length);
    console.log('Response type:', typeof result);
    
    // Parse AI response more flexibly
    const cleanResult = result.toLowerCase().trim();
    console.log('Cleaned AI response:', cleanResult);
    
    // Check for approval patterns
    if (cleanResult.includes('approved') || cleanResult === 'approved' || cleanResult.includes('approve')) {
      console.log('Image approved by AI');
      return { isAppropriate: true };
    } 
    // Check for rejection patterns
    else if (cleanResult.includes('rejected') || cleanResult.startsWith('rejected') || cleanResult.includes('reject')) {
      const reason = result.replace(/rejected:?/i, '').replace(/reject:?/i, '').trim();
      console.log('Image rejected by AI:', reason);
      return { isAppropriate: false, reason: reason || 'Inappropriate content detected' };
    } 
    // Check for empty or very short responses
    else if (!result || result.length < 3) {
      console.log('Empty or very short AI response, rejecting for safety');
      return { isAppropriate: false, reason: 'AI response too short - please try a different image' };
    }
    // Check for any positive indicators
    else if (cleanResult.includes('good') || cleanResult.includes('ok') || cleanResult.includes('fine') || cleanResult.includes('acceptable')) {
      console.log('Image approved by AI (positive indicators)');
      return { isAppropriate: true };
    }
    // Check for any negative indicators
    else if (cleanResult.includes('bad') || cleanResult.includes('inappropriate') || cleanResult.includes('not good') || cleanResult.includes('unacceptable')) {
      console.log('Image rejected by AI (negative indicators)');
      return { isAppropriate: false, reason: 'Inappropriate content detected' };
    }
    // Default to reject for safety
    else {
      console.log('Unclear AI response, rejecting image for safety:', result);
      return { isAppropriate: false, reason: `Unable to verify image content. AI said: "${result}"` };
    }
  } catch (error) {
    console.error('AI image review failed:', error);
    
    // Try fallback model if Grok fails
    try {
      console.log('Trying fallback model...');
      const fallbackResponse = await openai.chat.completions.create({
        model: 'meta-llama/llama-3.1-8b-instruct',
        messages: [
          {
            role: 'system',
            content: 'You are a content moderator. Look at the image and respond with "APPROVED" if appropriate or "REJECTED: [reason]" if inappropriate.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Look at this image. Respond with "APPROVED" if appropriate, or "REJECTED: [reason]" if inappropriate.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 15000,
        temperature: 0.1
      });
      
      const fallbackResult = fallbackResponse.choices[0]?.message?.content?.trim() || '';
      console.log('Fallback model response:', fallbackResult);
      
      if (fallbackResult.toLowerCase().includes('approved')) {
        return { isAppropriate: true };
      } else if (fallbackResult.toLowerCase().includes('rejected')) {
        return { isAppropriate: false, reason: 'Inappropriate content detected' };
      }
    } catch (fallbackError) {
      console.error('Fallback model also failed:', fallbackError);
    }
    
    // If both models fail, reject to be safe
    console.log('All AI models failed, rejecting image for safety');
    return { isAppropriate: false, reason: 'Image review failed - please try a different image' };
  }
};

// AI price suggestion function
const suggestPriceWithAI = async (title: string, description: string, category: string, openai: any): Promise<number> => {
  if (!openai) {
    throw new Error('AI not available');
  }

  try {
    console.log('Starting AI price suggestion...', { title, description, category });
    
    const response = await openai.chat.completions.create({
      model: 'x-ai/grok-4-fast:free',
      messages: [
        {
          role: 'system',
          content: `Ты эксперт по ценообразованию для маркетплейса. Анализируй товар и предлагай справедливую цену в рублях.

Учитывай:
- Категорию товара
- Описание и характеристики
- Рыночные тренды
- Состояние товара (если указано)

Отвечай ТОЛЬКО числом (цена в рублях), без дополнительного текста.`
        },
        {
          role: 'user',
          content: `Товар: ${title}
Категория: ${category}
Описание: ${description}

Предложи справедливую цену в рублях:`
        }
      ],
      max_tokens: 15000,
      temperature: 0.3
    });

    const result = response.choices[0]?.message?.content?.trim() || '';
    console.log('AI price suggestion response:', result);
    console.log('Full response:', response);
    
    // Extract number from response
    const priceMatch = result.match(/\d+/);
    if (priceMatch) {
      const price = parseInt(priceMatch[0]);
      console.log('Extracted price:', price);
      return price;
    }
    
    console.error('No price found in response:', result);
    throw new Error(`Не удалось определить цену из ответа: ${result}`);
    
  } catch (error) {
    console.error('AI price suggestion failed:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      title,
      description,
      category
    });
    throw new Error(`Ошибка генерации цены: ${(error as Error).message}`);
  }
};

// AI condition assessment function
const assessConditionWithAI = async (imageBase64: string, title: string, openai: any): Promise<{ condition: string; confidence: number; reasoning: string }> => {
  if (!openai) {
    throw new Error('AI not available');
  }

  try {
    console.log('Starting AI condition assessment...', { title, imageLength: imageBase64.length });
    
    const response = await openai.chat.completions.create({
      model: 'x-ai/grok-4-fast:free',
      messages: [
        {
          role: 'system',
          content: `Ты эксперт по оценке состояния товаров. Анализируй изображение и определяй состояние товара.

Состояния:
- "new" - новый, без следов использования
- "like_new" - как новый, минимальные следы использования
- "good" - хорошее состояние, небольшие потертости
- "fair" - удовлетворительное состояние, заметные следы использования
- "poor" - плохое состояние, значительные повреждения

Отвечай в формате JSON:
{
  "condition": "состояние",
  "confidence": число_от_0_до_100,
  "reasoning": "краткое объяснение"
}`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Оцени состояние товара "${title}" на изображении:` },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
      max_tokens: 200,
      temperature: 0.3
    });

    const result = response.choices[0]?.message?.content?.trim() || '';
    console.log('AI condition assessment response:', result);
    console.log('Full response:', response);
    
    // Parse JSON response
    const jsonMatch = result.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const assessment = JSON.parse(jsonMatch[0]);
        console.log('Parsed assessment:', assessment);
        
        const validConditions = ['new', 'like_new', 'good', 'fair', 'poor'];
        const condition = validConditions.includes(assessment.condition) ? assessment.condition : 'good';
        
        return {
          condition,
          confidence: Math.max(0, Math.min(100, assessment.confidence || 50)),
          reasoning: assessment.reasoning || 'Не удалось определить состояние'
        };
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error(`Ошибка парсинга JSON: ${(parseError as Error).message}`);
      }
    }
    
    console.error('No JSON found in response:', result);
    throw new Error(`Не удалось найти JSON в ответе: ${result}`);
    
  } catch (error) {
    console.error('AI condition assessment failed:', error);
    console.error('Error details:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      title,
      imageLength: imageBase64.length
    });
    throw new Error(`Ошибка оценки состояния: ${(error as Error).message}`);
  }
};

// AI text generation function for specific fields
const generateFieldWithAI = async (imageBase64: string, field: 'title' | 'description' | 'category' | 'tags', openai: any): Promise<string | string[]> => {
  if (!openai) {
    throw new Error('AI not available');
  }

  try {
    console.log(`Starting AI generation for ${field}...`);
    
    let fieldPrompt = '';
    let responseFormat = '';
    
    switch (field) {
      case 'title':
        fieldPrompt = 'Создай краткое и привлекательное название товара на основе изображения.';
        responseFormat = 'Отвечай ТОЛЬКО названием товара, без кавычек и дополнительного текста.';
        break;
      case 'description':
        fieldPrompt = 'Создай подробное описание товара на основе изображения. Включи основные характеристики, преимущества и особенности.';
        responseFormat = 'Отвечай ТОЛЬКО описанием товара, без дополнительного текста.';
        break;
      case 'category':
        fieldPrompt = 'Определи подходящую категорию товара на основе изображения. Выбери из: Электроника, Одежда, Книги, Спорт, Дом и сад, Красота, Игрушки, Другое.';
        responseFormat = 'Отвечай ТОЛЬКО названием категории, без дополнительного текста.';
        break;
      case 'tags':
        fieldPrompt = 'Создай 3-5 релевантных тегов для товара на основе изображения.';
        responseFormat = 'Отвечай ТОЛЬКО тегами через запятую, без дополнительного текста.';
        break;
    }
    
    const response = await openai.chat.completions.create({
      model: 'x-ai/grok-4-fast:free',
      messages: [
        {
          role: 'system',
          content: `Ты помощник для создания товаров маркетплейса. ${fieldPrompt}

Создавай ТОЛЬКО семейные, подходящие товары. НИКОГДА не создавай товары связанные с:
- Туалетами, ванными, канализацией, отходами
- Мусором, свалками, мусорными свалками
- Непристойным, оскорбительным или взрослым контентом
- Оружием, насилием, наркотиками, алкоголем
- Политическими или спорными темами

${responseFormat}`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Создай ${field === 'title' ? 'название' : field === 'description' ? 'описание' : field === 'category' ? 'категорию' : 'теги'} товара на основе этого изображения:` },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
      max_tokens: 15000,
      temperature: 0.7
    });

    const result = response.choices[0]?.message?.content?.trim() || '';
    console.log(`AI ${field} generation response:`, result);
    
    if (field === 'tags') {
      // Parse tags from comma-separated string
      return result.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
    }
    
    return result;
    
  } catch (error) {
    console.error(`AI ${field} generation failed:`, error);
    throw new Error(`Ошибка генерации ${field}`);
  }
};

// AI text generation function for marketplace items (kept for compatibility)
const generateItemTextWithAI = async (imageBase64: string, openai: any): Promise<{ title: string; description: string; category: string; tags: string[] }> => {
  if (!openai) {
    throw new Error('AI not available');
  }

  try {
    console.log('Starting AI text generation for marketplace item...');
    
    const response = await openai.chat.completions.create({
      model: 'x-ai/grok-4-fast:free',
      messages: [
        {
          role: 'system',
          content: `Ты генератор товаров для маркетплейса. Посмотри на изображение и создай подходящие детали товара.

Создавай ТОЛЬКО семейные, подходящие товары для маркетплейса. НИКОГДА не создавай товары связанные с:
- Туалетами, ванными, канализацией, отходами
- Мусором, свалками, мусорными свалками
- Непристойным, оскорбительным или взрослым контентом
- Оружием, насилием, наркотиками, алкоголем
- Политическими или спорными темами

Создавай ТОЛЬКО полезные, качественные товары: электроника, одежда, книги, игрушки, товары для дома, спорт, красота, здоровье, еда, путешествия и т.д.

Отвечай ТОЛЬКО валидным JSON в этом точном формате:
{
  "title": "Название товара",
  "description": "Подробное описание товара",
  "category": "Название категории",
  "tags": ["тег1", "тег2", "тег3"]
}`
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Создай детали товара для маркетплейса на основе этого изображения:' },
            { type: 'image_url', image_url: { url: imageBase64 } }
          ]
        }
      ],
      max_tokens: 15000,
      temperature: 0.7
    });

    const result = response.choices[0]?.message?.content?.trim() || '';
    console.log('AI text generation response:', result);
    
    // Parse JSON response - try multiple approaches
    let jsonString = '';
    let itemData = null;
    
    // First try: look for complete JSON object
    const jsonMatch = result.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    } else {
      // Second try: find first { and last }
      const startIndex = result.indexOf('{');
      const lastIndex = result.lastIndexOf('}');
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        jsonString = result.substring(startIndex, lastIndex + 1);
      }
    }
    
    if (jsonString) {
      try {
        itemData = JSON.parse(jsonString);
      } catch (parseError) {
        console.log('JSON parse failed, trying to fix...', parseError);
        // Try to fix common JSON issues
        jsonString = jsonString.replace(/,\s*}/g, '}'); // Remove trailing commas
        jsonString = jsonString.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
        try {
          itemData = JSON.parse(jsonString);
        } catch (secondError) {
          console.log('Second JSON parse attempt failed:', secondError);
        }
      }
    }
    
    if (!itemData) {
      throw new Error('No valid JSON found in AI response');
    }
    
    // Validate required fields
    if (!itemData.title || !itemData.description || !itemData.category) {
      throw new Error('AI response missing required fields');
    }
    
    // Ensure tags is an array
    if (!Array.isArray(itemData.tags)) {
      itemData.tags = [];
    }
    
    console.log('AI generated item data:', itemData);
    return itemData;
    
  } catch (error) {
    console.error('AI text generation failed:', error);
    throw new Error('Failed to generate item details from image');
  }
};

export const CreateListingDialog: React.FC<CreateListingDialogProps> = ({
  open,
  onClose,
  onCreated,
  aiTextGenerationEnabled = false,
}) => {
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [newTag, setNewTag] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [cards, setCards] = useState<any[]>([])
  const [payoutCardId, setPayoutCardId] = useState<string>('')
  const [purchaseLimitType, setPurchaseLimitType] = useState<'1' | 'custom' | 'infinite'>('infinite')
  const [purchaseLimitValue, setPurchaseLimitValue] = useState<string>('')
  const [imageReviewing, setImageReviewing] = useState(false)
  const [imageReviewResults, setImageReviewResults] = useState<Record<number, { isAppropriate: boolean; reason?: string }>>({})
  const [aiGeneratingText, setAiGeneratingText] = useState(false)
  const [generatingField, setGeneratingField] = useState<string | null>(null)
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)

  React.useEffect(() => {
    if (user && open) {
      (async () => {
        const { data, error } = await supabase
          .from('bank_cards')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
        if (!error && data) setCards(data)
      })()
    }
  }, [user, open])

  const handlePayoutCardChange = (e: any) => {
    setPayoutCardId(e.target.value)
  }

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateListingForm>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      category: '',
      condition: 'used',
      location: '',
      tags: [],
      purchase_limit_type: 'infinite',
      purchase_limit_value: undefined,
    },
  })

  const watchedTags = watch('tags')

  const handleAddTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      setValue('tags', [...watchedTags, newTag.trim()])
      setNewTag('')
      setShowTagSuggestions(false)
    }
  }

  const generateTagSuggestions = async (input: string) => {
    if (!aiTextGenerationEnabled || !openai || input.length < 2) {
      setTagSuggestions([])
      setShowTagSuggestions(false)
      return
    }

    try {
      const title = getValues('title') || ''
      const description = getValues('description') || ''
      const category = getValues('category') || ''
      
      if (!title && !description && !category) {
        setTagSuggestions([])
        setShowTagSuggestions(false)
        return
      }

      const response = await openai.chat.completions.create({
        model: 'x-ai/grok-4-fast:free',
        messages: [
          {
            role: 'system',
            content: `Ты помощник по тегам для маркетплейса. Предлагай релевантные теги на основе контекста товара.

Правила:
- Предлагай 3-5 коротких тегов
- Теги должны быть на русском языке
- Избегай дублирования существующих тегов
- Учитывай введенный пользователем текст

Отвечай ТОЛЬКО тегами через запятую, без дополнительного текста.`
          },
          {
            role: 'user',
            content: `Товар: ${title}
Категория: ${category}
Описание: ${description}
Пользователь ввел: "${input}"

Предложи релевантные теги:`
          }
        ],
        max_tokens: 15000,
        temperature: 0.7
      })

      const result = response.choices[0]?.message?.content?.trim() || ''
      const suggestions = result.split(',').map((tag: string) => tag.trim()).filter((tag: string) => 
        tag.length > 0 && !watchedTags.includes(tag) && tag.toLowerCase().includes(input.toLowerCase())
      )
      
      setTagSuggestions(suggestions.slice(0, 5))
      setShowTagSuggestions(suggestions.length > 0)
    } catch (error) {
      console.error('Tag suggestions failed:', error)
      setTagSuggestions([])
      setShowTagSuggestions(false)
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    try {
      setUploading(true)
      setImageReviewing(true)
      setError(undefined)
      
      const validFiles: File[] = []
      
      // First, validate all files
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Пожалуйста, загружайте только изображения')
          continue
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          setError('Размер файла не должен превышать 5MB')
          continue
        }
        
        validFiles.push(file)
      }

      if (validFiles.length === 0) {
        setUploading(false)
        setImageReviewing(false)
        return
      }

      // Process all valid files
      const uploadPromises = validFiles.map(async (file, index) => {
        return new Promise<{ base64: string; reviewResult: { isAppropriate: boolean; reason?: string } }>((resolve) => {
          const reader = new FileReader()
          reader.onload = async (e) => {
            const result = e.target?.result as string
            
            // Review image with AI
            const reviewResult = await reviewImageWithAI(result)
            resolve({ base64: result, reviewResult })
          }
          reader.readAsDataURL(file)
        })
      })

      // Wait for all images to be processed
      const results = await Promise.all(uploadPromises)
      
      const approvedImages: string[] = []
      const reviewResults: Record<number, { isAppropriate: boolean; reason?: string }> = {}
      let hasRejectedImages = false

      results.forEach((result, index) => {
        reviewResults[index] = result.reviewResult
        
        if (result.reviewResult.isAppropriate) {
          approvedImages.push(result.base64)
        } else {
          hasRejectedImages = true
          setError(`Изображение ${index + 1} отклонено: ${result.reviewResult.reason || 'Неподходящий контент'}`)
        }
      })

      // Update state
      setImages(prev => [...prev, ...approvedImages])
      setImageReviewResults(prev => ({ ...prev, ...reviewResults }))
      
      if (hasRejectedImages && approvedImages.length === 0) {
        setError('Все изображения были отклонены. Пожалуйста, загрузите подходящие изображения.')
      }
      
      // Note: AI text generation is now manual via magic icons, not automatic
      
      setUploading(false)
      setImageReviewing(false)
      
    } catch (error) {
      console.error('Error uploading image:', error)
      setError('Ошибка при загрузке изображения')
      setUploading(false)
      setImageReviewing(false)
    }
  }

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleMagicIconClick = async (field: 'title' | 'description' | 'category' | 'tags' | 'price' | 'condition') => {
    if (!aiTextGenerationEnabled || !openai) {
      setError('Для генерации AI необходимо включить функцию в настройках разработчика.')
      return
    }

    try {
      setGeneratingField(field)
      setError(undefined)
      
      if (field === 'price') {
        // Price suggestion based on current form data
        const currentTitle = getValues('title') || ''
        const currentDescription = getValues('description') || ''
        const currentCategory = getValues('category') || ''
        
        console.log('Price generation inputs:', { currentTitle, currentDescription, currentCategory });
        
        if (!currentTitle || !currentDescription || !currentCategory) {
          setError('Для предложения цены заполните название, описание и категорию.')
          return
        }
        
        const suggestedPrice = await suggestPriceWithAI(currentTitle, currentDescription, currentCategory, openai)
        setValue('price', suggestedPrice)
        console.log('AI suggested price:', suggestedPrice)
      } else if (field === 'condition') {
        // Condition assessment based on image
        if (images.length === 0) {
          setError('Для оценки состояния необходимо загрузить изображение.')
          return
        }
        
        const currentTitle = getValues('title') || 'Товар'
        console.log('Condition assessment inputs:', { currentTitle, imageCount: images.length });
        
        const assessment = await assessConditionWithAI(images[0], currentTitle, openai)
        setValue('condition', assessment.condition)
        console.log('AI assessed condition:', assessment)
      } else {
        // Text generation based on image
        if (images.length === 0) {
          setError('Для генерации AI необходимо загрузить изображения.')
          return
        }
        
        const result = await generateFieldWithAI(images[0], field, openai)
        
        if (field === 'tags') {
          setValue('tags', result as string[])
        } else {
          setValue(field, result as string)
        }
        
        console.log(`AI generated ${field}:`, result)
      }
    } catch (error) {
      console.error(`Magic icon generation failed for ${field}:`, error)
      setError(`Ошибка генерации ${field === 'title' ? 'названия' : field === 'description' ? 'описания' : field === 'category' ? 'категории' : field === 'tags' ? 'тегов' : field === 'price' ? 'цены' : 'состояния'}. Попробуйте еще раз.`)
    } finally {
      setGeneratingField(null)
    }
  }

  const onSubmit = async (data: CreateListingForm) => {
    if (!user) {
      setError('Вы должны быть авторизованы')
      return
    }
    if (!payoutCardId) {
      setError('Выберите карту для получения оплаты')
      return
    }

    // AI review for title and description
    try {
      setLoading(true);
      setError(undefined);
      
      // Review title with AI
      const titleReview = await reviewTextWithAI(data.title, 'title');
      if (!titleReview.isAppropriate) {
        setError(`Название отклонено: ${titleReview.reason}. Пожалуйста, измените название.`);
        setLoading(false);
        return;
      }
      
      // Review description with AI
      const descriptionReview = await reviewTextWithAI(data.description, 'description');
      if (!descriptionReview.isAppropriate) {
        setError(`Описание отклонено: ${descriptionReview.reason}. Пожалуйста, измените описание.`);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error('AI text review failed:', error);
      setError('Ошибка проверки контента. Попробуйте еще раз.');
      setLoading(false);
      return;
    }

    // Validate content appropriateness (fallback keyword check)
    const validation = validateItemContent({
      title: data.title,
      description: data.description,
      category: data.category,
      tags: data.tags
    });
    
    if (!validation.isValid) {
      setError(`Неподходящий контент: ${validation.reason}. Пожалуйста, измените название, описание или теги.`)
      setLoading(false);
      return
    }

    try {
      // Calculate purchase limit value
      let purchaseLimit = null;
      if (purchaseLimitType === '1') {
        purchaseLimit = 1;
      } else if (purchaseLimitType === 'custom' && purchaseLimitValue) {
        purchaseLimit = parseInt(purchaseLimitValue);
      }
      // If purchaseLimitType is 'infinite', purchaseLimit remains null

      const { error } = await supabase
        .from('marketplace_items')
        .insert({
          title: data.title,
          description: data.description,
          price: data.price,
          currency: 'MR',
          category: data.category,
          condition: data.condition,
          location: data.location,
          tags: data.tags,
          seller_id: user.id,
          images: images,
          is_active: true,
          payout_card_id: payoutCardId,
          purchase_limit: purchaseLimit,
        })
      if (error) throw error
      reset()
      setPayoutCardId('')
      onCreated()
    } catch (error) {
      console.error('Error creating listing:', error)
      setError('Ошибка при создании объявления')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setError(undefined)
    setNewTag('')
    setImages([])
    setPurchaseLimitType('infinite')
    setPurchaseLimitValue('')
    setImageReviewing(false)
    setImageReviewResults({})
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          maxHeight: '90vh',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, borderBottom: '1px solid', borderColor: 'divider', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : undefined }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Разместить товар</Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ pt: 2, pb: 1, maxHeight: '70vh', overflow: 'auto', bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.01)' : undefined }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gap: 2 }}>
            {/* Payout Card Selection */}
            <Box sx={{ 
              p: 2, 
              bgcolor: (theme) => theme.palette.mode === 'light' ? 'primary.50' : 'rgba(255,255,255,0.04)', 
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: (theme) => theme.palette.mode === 'light' ? 'primary.200' : 'rgba(255,255,255,0.12)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CreditCard fontSize="small" color="primary" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  Карта для оплаты
                </Typography>
              </Box>
              <FormControl fullWidth size="small">
                <Select
                  value={payoutCardId}
                  onChange={handlePayoutCardChange}
                  displayEmpty
                  sx={{
                    '& .MuiSelect-select': {
                      py: 1,
                    }
                  }}
                >
                  <MenuItem value="" disabled>
                    <Typography variant="body2" color="text.secondary">
                      Выберите карту
                    </Typography>
                  </MenuItem>
                  {cards.map(card => (
                    <MenuItem key={card.id} value={card.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Box sx={{
                          width: 28,
                          height: 18,
                          borderRadius: 1,
                          background: 'linear-gradient(45deg, #667eea, #764ba2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontSize: '0.65rem',
                          fontWeight: 'bold'
                        }}>
                          {card.card_type === 'credit' ? 'CR' : 'DB'}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.875rem' }}>
                            {card.card_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •••• {card.card_number.slice(-4)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {card.balance} МР
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {cards.length === 0 && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    Создайте карту в "Панель управления"
                  </Typography>
                )}
              </FormControl>
            </Box>

            {/* Image Upload Section */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <PhotoCamera fontSize="small" color="action" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Фотографии
                </Typography>
              </Box>
              
              {/* Image Preview Grid */}
              {images.length > 0 && (
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                  gap: 1, 
                  mb: 1.5,
                  maxHeight: 150,
                  overflow: 'auto'
                }}>
                  {images.map((image, index) => {
                    const reviewResult = imageReviewResults[index];
                    const isRejected = reviewResult && !reviewResult.isAppropriate;
                    
                    return (
                      <Card key={index} sx={{ 
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 1.5,
                        overflow: 'hidden',
                        boxShadow: 1,
                        border: isRejected ? '2px solid' : 'none',
                        borderColor: isRejected ? 'error.main' : 'transparent',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'scale(1.02)',
                          transition: 'all 0.2s ease'
                        }
                      }}>
                        <CardMedia
                          component="img"
                          image={image}
                          alt={`Фото ${index + 1}`}
                          sx={{ 
                            objectFit: 'cover',
                            height: '100%',
                            width: '100%',
                            filter: isRejected ? 'grayscale(50%)' : 'none'
                          }}
                        />
                        {isRejected && (
                          <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(244, 67, 54, 0.8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            p: 0.5
                          }}>
                            <Typography variant="caption" color="white" sx={{ 
                              textAlign: 'center', 
                              fontSize: '0.6rem',
                              fontWeight: 'bold'
                            }}>
                              Отклонено
                            </Typography>
                          </Box>
                        )}
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            width: 20,
                            height: 20,
                            '&:hover': {
                              backgroundColor: 'rgba(0,0,0,0.9)',
                            },
                          }}
                          onClick={() => handleRemoveImage(index)}
                        >
                          <Delete sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Card>
                    );
                  })}
                </Box>
              )}

              {/* Upload Button */}
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                size="small"
                disabled={uploading || imageReviewing}
                sx={{ 
                  width: '100%',
                  py: 1,
                  borderStyle: 'dashed',
                  borderWidth: 1.5,
                  '&:hover': {
                    borderStyle: 'solid',
                    borderWidth: 1.5,
                  }
                }}
              >
                {imageReviewing ? 'AI проверяет изображения...' : uploading ? 'Загрузка...' : images.length === 0 ? 'Добавить фото' : 'Добавить еще'}
                <input
                  type="file"
                  hidden
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                Макс. 5MB, JPG/PNG/GIF
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                ✅ AI проверяет изображения на подходящий контент
              </Typography>
            </Box>

            {/* Basic Information Section */}
            <Box sx={{ 
              p: 2, 
              bgcolor: (theme) => theme.palette.mode === 'light' ? 'grey.50' : 'rgba(255,255,255,0.04)', 
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <DescriptionOutlined fontSize="small" color="action" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Основная информация
                </Typography>
              </Box>
              
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Название товара"
                      fullWidth
                      size="small"
                      error={!!errors.title}
                      helperText={errors.title?.message}
                      InputProps={{
                        endAdornment: aiTextGenerationEnabled && images.length > 0 ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleMagicIconClick('title');
                              }}
                              disabled={generatingField === 'title'}
                              title="Сгенерировать название с помощью AI"
                            >
                              {generatingField === 'title' ? <HourglassEmpty fontSize="small" /> : <AutoFixHigh fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ) : undefined
                      }}
                    />
                  )}
                />

                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Описание"
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      error={!!errors.description}
                      helperText={errors.description?.message}
                      placeholder="Опишите товар..."
                      InputProps={{
                        endAdornment: aiTextGenerationEnabled && images.length > 0 ? (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleMagicIconClick('description');
                              }}
                              disabled={generatingField === 'description'}
                              title="Сгенерировать описание с помощью AI"
                            >
                              {generatingField === 'description' ? <HourglassEmpty fontSize="small" /> : <Psychology fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ) : undefined
                      }}
                    />
                  )}
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Controller
                    name="price"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Цена"
                        type="number"
                        fullWidth
                        size="small"
                        error={!!errors.price}
                        helperText={errors.price?.message}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">MR</InputAdornment>,
                          endAdornment: aiTextGenerationEnabled ? (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleMagicIconClick('price');
                                }}
                                disabled={generatingField === 'price'}
                                title="Предложить цену с помощью AI"
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'action.hover'
                                  }
                                }}
                              >
                                {generatingField === 'price' ? <HourglassEmpty fontSize="small" /> : <AttachMoney fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ) : undefined
                        }}
                      />
                    )}
                  />

                  <Box sx={{ position: 'relative' }}>
                    <Controller
                      name="condition"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth size="small" error={!!errors.condition}>
                          <InputLabel>Состояние</InputLabel>
                          <Select {...field} label="Состояние">
                            {conditions.map((condition) => (
                              <MenuItem key={condition.value} value={condition.value}>
                                {condition.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                    {aiTextGenerationEnabled && images.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMagicIconClick('condition');
                        }}
                        disabled={generatingField === 'condition'}
                        title="Оценить состояние с помощью AI"
                        sx={{
                          position: 'absolute',
                          right: 32, // Move further left to avoid dropdown arrow
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1,
                          backgroundColor: 'background.paper',
                          border: 1,
                          borderColor: 'divider',
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        {generatingField === 'condition' ? <HourglassEmpty fontSize="small" /> : <Assessment fontSize="small" />}
                      </IconButton>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth size="small" error={!!errors.category}>
                          <InputLabel>Категория</InputLabel>
                          <Select {...field} label="Категория">
                            {categories.map((category) => (
                              <MenuItem key={category} value={category}>
                                {category}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                    {aiTextGenerationEnabled && images.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleMagicIconClick('category');
                        }}
                        disabled={generatingField === 'category'}
                        title="Сгенерировать категорию с помощью AI"
                        sx={{
                          position: 'absolute',
                          right: 32, // Move further left to avoid dropdown arrow
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 1,
                          backgroundColor: 'background.paper',
                          border: 1,
                          borderColor: 'divider',
                          '&:hover': {
                            backgroundColor: 'action.hover'
                          }
                        }}
                      >
                        {generatingField === 'category' ? <HourglassEmpty fontSize="small" /> : <Category fontSize="small" />}
                      </IconButton>
                    )}
                  </Box>

                  <Controller
                    name="location"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Местоположение"
                        fullWidth
                        size="small"
                        error={!!errors.location}
                        helperText={errors.location?.message}
                        placeholder="Город..."
                      />
                    )}
                  />
                </Box>
              </Box>
            </Box>

            {/* Purchase Limit Section */}
            <Box sx={{ 
              p: 2, 
              bgcolor: (theme) => theme.palette.mode === 'light' ? 'warning.50' : 'rgba(255,193,7,0.08)', 
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: (theme) => theme.palette.mode === 'light' ? 'warning.200' : 'rgba(255,193,7,0.24)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Flag fontSize="small" color="warning" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                  Лимит покупок
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Тип лимита</InputLabel>
                  <Select
                    value={purchaseLimitType}
                    onChange={(e) => setPurchaseLimitType(e.target.value as '1' | 'custom' | 'infinite')}
                    label="Тип лимита"
                  >
                    <MenuItem value="1">1 покупка</MenuItem>
                    <MenuItem value="custom">Кастомное</MenuItem>
                    <MenuItem value="infinite">Безлимитно</MenuItem>
                  </Select>
                </FormControl>
                
                {purchaseLimitType === 'custom' && (
                  <TextField
                    label="Количество"
                    type="number"
                    value={purchaseLimitValue}
                    onChange={(e) => setPurchaseLimitValue(e.target.value)}
                    size="small"
                    sx={{ minWidth: 120 }}
                    inputProps={{ min: 1 }}
                  />
                )}
              </Box>
            </Box>

            {/* Tags Section */}
            <Box sx={{ 
              p: 2, 
              bgcolor: (theme) => theme.palette.mode === 'light' ? 'success.50' : 'rgba(76,175,80,0.08)', 
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: (theme) => theme.palette.mode === 'light' ? 'success.200' : 'rgba(76,175,80,0.24)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <LabelOutlined fontSize="small" color="success" />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.dark' }}>
                  Теги
                </Typography>
              </Box>
              
              {/* Existing Tags */}
              {watchedTags.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
                  {watchedTags.map((tag, index) => (
                    <Chip
                      key={index}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      color="success"
                      variant="outlined"
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        '&:hover': {
                          background: 'success.main',
                          color: 'white',
                        }
                      }}
                    />
                  ))}
                </Box>
              )}

              {/* Add New Tag */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  value={newTag}
                  onChange={(e) => {
                    setNewTag(e.target.value)
                    generateTagSuggestions(e.target.value)
                  }}
                  onKeyPress={handleKeyPress}
                  onFocus={() => {
                    if (newTag.length >= 2) {
                      generateTagSuggestions(newTag)
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow clicking
                    setTimeout(() => setShowTagSuggestions(false), 200)
                  }}
                  placeholder="Введите тег"
                  size="small"
                  sx={{ flexGrow: 1 }}
                  InputProps={{
                    endAdornment: (
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {aiTextGenerationEnabled && images.length > 0 && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleMagicIconClick('tags');
                            }}
                            disabled={generatingField === 'tags'}
                            title="Сгенерировать теги с помощью AI"
                          >
                            {generatingField === 'tags' ? <HourglassEmpty fontSize="small" /> : <LocalOffer fontSize="small" />}
                          </IconButton>
                        )}
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={handleAddTag}
                          disabled={!newTag.trim()}
                          sx={{ ml: 0.5 }}
                        >
                          Добавить
                        </Button>
                      </Box>
                    ),
                  }}
                />
              </Box>
              
              {/* Tag Suggestions */}
              {showTagSuggestions && tagSuggestions.length > 0 && (
                <Box sx={{ 
                  position: 'relative',
                  mt: 1,
                  p: 1,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  boxShadow: 2
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Предложения AI:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {tagSuggestions.map((suggestion, index) => (
                      <Chip
                        key={index}
                        label={suggestion}
                        size="small"
                        variant="outlined"
                        clickable
                        onClick={() => {
                          setNewTag(suggestion)
                          setShowTagSuggestions(false)
                        }}
                        sx={{
                          fontSize: '0.7rem',
                          '&:hover': {
                            bgcolor: 'primary.main',
                            color: 'white'
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
              
              {errors.tags && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                  {errors.tags.message}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          px: 2, 
          pb: 2, 
          pt: 1.5,
          gap: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          background: (theme) => theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255,255,255,0.03)'
        }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            variant="outlined"
          >
            Отмена
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading || !payoutCardId}
          >
            {loading ? 'Создание...' : 'Разместить'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
} 