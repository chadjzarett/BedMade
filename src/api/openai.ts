import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';
import { API, STORAGE_KEYS } from '../constants/config';

// Constants
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_VISION_MODEL = API.OPENAI_MODEL;
const OPENAI_API_KEY_STORAGE_KEY = STORAGE_KEYS.OPENAI_API_KEY;

/**
 * Analyze a bed image using OpenAI's Vision API
 * Following the official documentation: https://platform.openai.com/docs/guides/vision
 */
export const analyzeBedImage = async (imageUri: string): Promise<{
  success: boolean;
  isMade: boolean;
  message: string;
  confidence?: number;
}> => {
  try {
    // Get the API key from secure storage or config
    const apiKey = await getOpenAIApiKey();
    
    if (!apiKey) {
      console.error('No OpenAI API key available');
      return {
        success: false,
        isMade: false,
        message: 'API key not configured. Please set up your OpenAI API key in settings.'
      };
    }

    // Convert image to base64
    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Prepare the request payload according to OpenAI's vision API documentation
    const payload = {
      model: OPENAI_VISION_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a bed-making verification assistant. Analyze the image and determine if the bed appears to be properly made with the following criteria: 1. Sheets and/or comforter are pulled up, 2. Surface is relatively flat and unwrinkled, 3. Pillows are arranged neatly (if visible)."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and determine if the bed appears to be properly made. Respond with a JSON object: {\"is_made\": true|false, \"confidence\": 0-100, \"feedback\": \"brief explanation\"}"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300
    };

    // Make the API request
    const response = await axios.post(
      OPENAI_API_URL,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    // Process the response
    const content = response.data.choices[0]?.message?.content || '';
    
    try {
      // Parse the JSON response
      const result = JSON.parse(content);
      
      return {
        success: true,
        isMade: result.is_made,
        message: result.feedback,
        confidence: result.confidence
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      
      // Fallback to text analysis if JSON parsing fails
      const isMade = content.toLowerCase().includes('yes') || 
                    (content.toLowerCase().includes('made') && 
                    !content.toLowerCase().includes('not made') && 
                    !content.toLowerCase().includes('isn\'t made'));
      
      return {
        success: true,
        isMade,
        message: 'We had trouble analyzing your bed, but it appears to be ' + 
                 (isMade ? 'made.' : 'not made properly.')
      };
    }
  } catch (error: any) {
    console.error('Error analyzing bed image:', error);
    
    // Handle specific error cases
    if (axios.isAxiosError(error) && error.response) {
      if (error.response.status === 401) {
        return {
          success: false,
          isMade: false,
          message: 'Authentication failed. Please check your OpenAI API key in settings.'
        };
      }
    }
    
    return {
      success: false,
      isMade: false,
      message: 'Failed to analyze the image. Please try again.'
    };
  }
};

/**
 * Check if the OpenAI API is available
 */
export const isOpenAIApiKeySet = async (): Promise<boolean> => {
  const apiKey = await getOpenAIApiKey();
  return !!apiKey && apiKey !== 'sk-your-actual-openai-api-key';
};

/**
 * Get the OpenAI API key from secure storage
 */
export const getOpenAIApiKey = async (): Promise<string | null> => {
  try {
    // First try to get from secure storage
    const storedKey = await SecureStore.getItemAsync(OPENAI_API_KEY_STORAGE_KEY);
    if (storedKey) {
      return storedKey;
    }
    
    // Fall back to config if not in secure storage
    return API.OPENAI_API_KEY !== 'sk-your-actual-openai-api-key' ? API.OPENAI_API_KEY : null;
  } catch (error) {
    console.error('Error getting OpenAI API key:', error);
    return null;
  }
};

/**
 * Set the OpenAI API key in secure storage
 */
export const setOpenAIApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    await SecureStore.setItemAsync(OPENAI_API_KEY_STORAGE_KEY, apiKey);
    return true;
  } catch (error) {
    console.error('Error setting OpenAI API key:', error);
    return false;
  }
}; 