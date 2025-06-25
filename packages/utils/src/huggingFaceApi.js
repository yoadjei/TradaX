import Constants from 'expo-constants';
import { externalApi } from './api';

// Get Hugging Face API key from environment
const HUGGING_FACE_API_KEY = Constants.expoConfig?.extra?.huggingFaceApiKey || process.env.HUGGING_FACE_API_KEY || '';

// Hugging Face Inference API base URL
const HUGGING_FACE_BASE_URL = 'https://api-inference.huggingface.co';

// Model configuration - using a free text generation model
const DEFAULT_MODEL = 'microsoft/DialoGPT-medium';

// Rate limiting helper for Hugging Face API
class HuggingFaceRateLimit {
  constructor(requestsPerMinute = 30) {
    this.requests = [];
    this.maxRequests = requestsPerMinute;
  }

  async waitIfNeeded() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest) + 1000; // Add 1s buffer
      
      if (waitTime > 0) {
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again.`);
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new HuggingFaceRateLimit(30);

/**
 * System prompt for cryptocurrency education and trading guidance
 */
const SYSTEM_PROMPT = `You are a helpful cryptocurrency education assistant for TradaX, a cryptocurrency trading platform. Your role is to:

1. Explain cryptocurrency concepts in simple, easy-to-understand terms
2. Provide educational information about blockchain technology, trading strategies, and market analysis
3. Help users understand risks and benefits of cryptocurrency investing
4. Answer questions about DeFi, NFTs, and other crypto-related topics
5. Provide general market insights and educational content

IMPORTANT DISCLAIMERS:
- Always emphasize that this is educational content only, not financial advice
- Remind users to do their own research (DYOR) before making investment decisions
- Mention that cryptocurrency investments are high-risk and can result in significant losses
- Advise users to only invest what they can afford to lose
- Recommend consulting with financial professionals for personalized advice

Keep responses concise, informative, and beginner-friendly. Focus on education rather than specific investment recommendations.`;

/**
 * Hugging Face API client for AI chat functionality
 */
export const huggingFaceApi = {
  /**
   * Send a message to the AI assistant
   * @param {string} message - User message
   * @param {Array} conversationHistory - Previous conversation context
   * @returns {Promise<string>}
   */
  async sendMessage(message, conversationHistory = []) {
    if (!HUGGING_FACE_API_KEY) {
      throw new Error('Hugging Face API key not configured. Please check your environment variables.');
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Please provide a valid message.');
    }

    try {
      await rateLimiter.waitIfNeeded();

      // Prepare the conversation context
      const contextMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: 'user', content: message.trim() }
      ];

      // Format the prompt for the model
      const prompt = this.formatPromptForModel(contextMessages);

      const response = await externalApi.request(
        `${HUGGING_FACE_BASE_URL}/models/${DEFAULT_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: {
            inputs: prompt,
            parameters: {
              max_new_tokens: 200,
              temperature: 0.7,
              do_sample: true,
              top_p: 0.9,
              repetition_penalty: 1.1,
            },
            options: {
              wait_for_model: true,
              use_cache: false,
            },
          },
        }
      );

      // Handle different response formats
      if (Array.isArray(response) && response.length > 0) {
        const generatedText = response[0].generated_text || response[0].text || '';
        return this.cleanResponse(generatedText, prompt);
      } else if (response.generated_text) {
        return this.cleanResponse(response.generated_text, prompt);
      } else if (response.error) {
        throw new Error(response.error);
      } else {
        throw new Error('Unexpected response format from AI service');
      }

    } catch (error) {
      console.error('Hugging Face API error:', error);
      
      if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
        throw new Error('I\'m currently receiving too many requests. Please wait a moment and try again.');
      }
      
      if (error.message.includes('API key') || error.message.includes('authorization')) {
        throw new Error('AI service configuration error. Please contact support.');
      }
      
      if (error.message.includes('model') && error.message.includes('loading')) {
        throw new Error('AI model is starting up. Please wait a moment and try again.');
      }
      
      if (error.message.includes('Network error')) {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      }
      
      throw new Error(error.message || 'Failed to get response from AI assistant. Please try again.');
    }
  },

  /**
   * Format conversation messages for the model
   * @param {Array} messages - Array of message objects
   * @returns {string}
   */
  formatPromptForModel(messages) {
    // Create a conversation format that works well with the model
    let prompt = '';
    
    for (const message of messages) {
      if (message.role === 'system') {
        prompt += `System: ${message.content}\n\n`;
      } else if (message.role === 'user') {
        prompt += `Human: ${message.content}\n`;
      } else if (message.role === 'assistant') {
        prompt += `Assistant: ${message.content}\n`;
      }
    }
    
    prompt += 'Assistant:';
    return prompt;
  },

  /**
   * Clean and format the AI response
   * @param {string} response - Raw response from the model
   * @param {string} prompt - Original prompt sent to the model
   * @returns {string}
   */
  cleanResponse(response, prompt) {
    if (!response || typeof response !== 'string') {
      return 'I apologize, but I couldn\'t generate a proper response. Please try rephrasing your question.';
    }

    // Remove the original prompt from the response
    let cleaned = response.replace(prompt, '').trim();
    
    // Remove any leading "Assistant:" or similar prefixes
    cleaned = cleaned.replace(/^(Assistant:|AI:|Bot:)\s*/i, '');
    
    // Remove any trailing incomplete sentences or artifacts
    cleaned = cleaned.replace(/\[.*?\]/g, ''); // Remove any bracketed content
    cleaned = cleaned.replace(/\.\.\.$/, '.'); // Replace trailing ellipsis with period
    
    // Ensure the response ends properly
    if (cleaned && !cleaned.match(/[.!?]$/)) {
      cleaned += '.';
    }

    // Add disclaimer if the response doesn't already include one
    if (cleaned && !cleaned.toLowerCase().includes('not financial advice') && 
        !cleaned.toLowerCase().includes('educational') && 
        !cleaned.toLowerCase().includes('dyor')) {
      cleaned += '\n\n💡 Remember: This is educational information only, not financial advice. Always do your own research (DYOR) before making investment decisions.';
    }

    return cleaned || 'I\'m sorry, I couldn\'t provide a helpful response to that question. Could you please try asking in a different way?';
  },

  /**
   * Check if the API key is configured
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(HUGGING_FACE_API_KEY && HUGGING_FACE_API_KEY.length > 0);
  },

  /**
   * Get suggested questions for new users
   * @returns {Array<string>}
   */
  getSuggestedQuestions() {
    return [
      "What is Bitcoin and how does it work?",
      "How do I start trading cryptocurrency safely?",
      "What are the main risks of crypto investing?",
      "Can you explain what DeFi means?",
      "What is the difference between Bitcoin and Ethereum?",
      "How do I read cryptocurrency charts?",
      "What is market cap in cryptocurrency?",
      "Should I invest in altcoins as a beginner?",
    ];
  },

  /**
   * Generate a welcome message for new chat sessions
   * @returns {string}
   */
  getWelcomeMessage() {
    return `Welcome to TradaX AI Assistant! 🤖

I'm here to help you learn about cryptocurrency and blockchain technology. I can explain:
• Basic crypto concepts and terminology
• Trading strategies and market analysis
• DeFi, NFTs, and blockchain technology
• Risk management and best practices

⚠️ **Important**: I provide educational information only, not financial advice. Always do your own research and consult with financial professionals before making investment decisions.

What would you like to learn about today?`;
  },
};

/**
 * Conversation history manager
 */
export class ConversationManager {
  constructor(maxMessages = 20) {
    this.messages = [];
    this.maxMessages = maxMessages;
  }

  addMessage(role, content) {
    this.messages.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    // Keep only the most recent messages
    if (this.messages.length > this.maxMessages) {
      this.messages = this.messages.slice(-this.maxMessages);
    }
  }

  getHistory() {
    return this.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  clear() {
    this.messages = [];
  }

  export() {
    return JSON.stringify(this.messages, null, 2);
  }

  import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      if (Array.isArray(imported)) {
        this.messages = imported.slice(-this.maxMessages);
      }
    } catch (error) {
      console.error('Failed to import conversation history:', error);
    }
  }
}
