import { externalApi } from './api';

const GNEWS_BASE_URL = 'https://gnews.io/api/v4';
const GNEWS_API_KEY = 'b94bb9dbcc8ca93ac8b953ad25f75595';

class NewsRateLimit {
  constructor(requestsPerDay = 100) { // GNews free tier: 100 requests/day
    this.requests = [];
    this.maxRequests = requestsPerDay;
  }

  async waitIfNeeded() {
    const now = Date.now();
    const oneDayAgo = now - 86400000; // 24 hours in milliseconds

    // Remove requests older than 24 hours
    this.requests = this.requests.filter(time => time > oneDayAgo);

    if (this.requests.length >= this.maxRequests) {
      throw new Error('Daily API limit reached. Please try again tomorrow.');
    }

    this.requests.push(now);
  }
}

const newsRateLimit = new NewsRateLimit(100);

// Helper function to make GNews API requests with proper authentication
const makeNewsRequest = async (endpoint, params = {}) => {
  await newsRateLimit.waitIfNeeded();
  
  const searchParams = new URLSearchParams({
    apikey: GNEWS_API_KEY,
    ...params
  });
  
  const url = `${GNEWS_BASE_URL}/${endpoint}?${searchParams.toString()}`;
  return await externalApi.request(url);
};

export const newsApi = {
  /**
   * Fetch the latest cryptocurrency news from top headlines.
   * @param {Object} options - Optional parameters
   * @param {string} options.lang - Language code (default: 'en')
   * @param {string} options.country - Country code (optional)
   * @param {number} options.max - Maximum number of articles (1-10, default: 10)
   * @returns {Promise<Array>} An array of news articles.
   */
  getLatestNews: async (options = {}) => {
    try {
      const {
        lang = 'en',
        country,
        max = 10
      } = options;

      const params = {
        q: 'cryptocurrency OR bitcoin OR ethereum OR crypto OR blockchain',
        lang,
        max: Math.min(max, 10) // GNews limits to 10 articles per request
      };

      if (country) {
        params.country = country;
      }

      const response = await makeNewsRequest('search', params);
      
      return response.articles.map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        image: article.image,
        publishedAt: new Date(article.publishedAt),
        source: {
          name: article.source.name,
          url: article.source.url
        }
      }));
    } catch (error) {
      console.error('Error fetching crypto news:', error);
      throw new Error('Failed to fetch cryptocurrency news.');
    }
  },

  /**
   * Search for specific cryptocurrency news.
   * @param {string} query - Search query
   * @param {Object} options - Optional parameters
   * @param {string} options.lang - Language code (default: 'en')
   * @param {string} options.country - Country code (optional)
   * @param {number} options.max - Maximum number of articles (1-10, default: 10)
   * @param {string} options.from - Start date (ISO format, optional)
   * @param {string} options.to - End date (ISO format, optional)
   * @param {string} options.sortby - Sort by 'publishedAt' or 'relevance' (default: 'publishedAt')
   * @returns {Promise<Array>} An array of news articles.
   */
  searchNews: async (query, options = {}) => {
    try {
      const {
        lang = 'en',
        country,
        max = 10,
        from,
        to,
        sortby = 'publishedAt'
      } = options;

      const params = {
        q: `${query} AND (cryptocurrency OR bitcoin OR ethereum OR crypto OR blockchain)`,
        lang,
        max: Math.min(max, 10),
        sortby
      };

      if (country) params.country = country;
      if (from) params.from = from;
      if (to) params.to = to;

      const response = await makeNewsRequest('search', params);
      
      return response.articles.map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        image: article.image,
        publishedAt: new Date(article.publishedAt),
        source: {
          name: article.source.name,
          url: article.source.url
        }
      }));
    } catch (error) {
      console.error('Error searching news:', error);
      throw new Error(`Failed to search news for "${query}".`);
    }
  },

  /**
   * Get top headlines (general, can be filtered by topic).
   * @param {Object} options - Optional parameters
   * @param {string} options.topic - Topic category (business, entertainment, general, health, science, sports, technology)
   * @param {string} options.lang - Language code (default: 'en')
   * @param {string} options.country - Country code (optional)
   * @param {number} options.max - Maximum number of articles (1-10, default: 10)
   * @returns {Promise<Array>} An array of news articles.
   */
  getTopHeadlines: async (options = {}) => {
    try {
      const {
        topic,
        lang = 'en',
        country,
        max = 10
      } = options;

      const params = {
        lang,
        max: Math.min(max, 10)
      };

      if (topic) params.topic = topic;
      if (country) params.country = country;

      const response = await makeNewsRequest('top-headlines', params);
      
      return response.articles.map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        image: article.image,
        publishedAt: new Date(article.publishedAt),
        source: {
          name: article.source.name,
          url: article.source.url
        }
      }));
    } catch (error) {
      console.error('Error fetching top headlines:', error);
      throw new Error('Failed to fetch top headlines.');
    }
  },

  /**
   * Get cryptocurrency news by specific coin/token.
   * @param {string} coinName - Name of the cryptocurrency (e.g., 'Bitcoin', 'Ethereum')
   * @param {Object} options - Optional parameters
   * @returns {Promise<Array>} An array of news articles.
   */
  getCoinNews: async (coinName, options = {}) => {
    try {
      const searchQuery = `${coinName} cryptocurrency`;
      return await newsApi.searchNews(searchQuery, options);
    } catch (error) {
      console.error(`Error fetching ${coinName} news:`, error);
      throw new Error(`Failed to fetch ${coinName} news.`);
    }
  },

  /**
   * Get news by category/topic related to crypto.
   * @param {string} category - Category like 'DeFi', 'NFT', 'regulation', 'mining', etc.
   * @param {Object} options - Optional parameters
   * @returns {Promise<Array>} An array of news articles.
   */
  getCategoryNews: async (category, options = {}) => {
    try {
      const searchQuery = `${category} cryptocurrency blockchain`;
      return await newsApi.searchNews(searchQuery, options);
    } catch (error) {
      console.error(`Error fetching ${category} news:`, error);
      throw new Error(`Failed to fetch ${category} news.`);
    }
  },

  /**
   * Get breaking/urgent cryptocurrency news (last 24 hours).
   * @param {Object} options - Optional parameters
   * @returns {Promise<Array>} An array of recent news articles.
   */
  getBreakingNews: async (options = {}) => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const searchOptions = {
        ...options,
        from: yesterday.toISOString(),
        sortby: 'publishedAt'
      };

      return await newsApi.getLatestNews(searchOptions);
    } catch (error) {
      console.error('Error fetching breaking news:', error);
      throw new Error('Failed to fetch breaking cryptocurrency news.');
    }
  }
};

// Utility functions for news formatting
export const formatNewsDate = (date) => {
  if (!(date instanceof Date)) {
    return 'Unknown date';
  }
  
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else {
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
};

export const truncateContent = (content, maxLength = 150) => {
  if (!content || content.length <= maxLength) {
    return content;
  }
  
  return content.substring(0, maxLength).trim() + '...';
};

export const extractKeywords = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();
  const cryptoKeywords = [
    'bitcoin', 'btc', 'ethereum', 'eth', 'cryptocurrency', 'crypto', 
    'blockchain', 'defi', 'nft', 'altcoin', 'mining', 'trading',
    'regulation', 'sec', 'adoption', 'price', 'market', 'bull', 'bear'
  ];
  
  return cryptoKeywords.filter(keyword => text.includes(keyword));
};