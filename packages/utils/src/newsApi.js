import { externalApi } from './api';

const GNEWS_BASE_URL = 'https://gnews.io/api/v4';
const GNEWS_API_KEY = 'b94bb9dbcc8ca93ac8b953ad25f75595';

// GNews: 10 max articles per request
const GNEWS_HARD_MAX = 10;

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

const DEFAULT_QUERY = 'cryptocurrency OR bitcoin OR ethereum OR crypto OR blockchain';

// ------------------------------------------------------------------
// Core request helpers
// ------------------------------------------------------------------
const makeNewsRequest = async (endpoint, params = {}) => {
  await newsRateLimit.waitIfNeeded();

  const searchParams = new URLSearchParams({
    apikey: GNEWS_API_KEY,
    ...params,
  });

  const url = `${GNEWS_BASE_URL}/${endpoint}?${searchParams.toString()}`;
  const json = await externalApi.request(url);

  // externalApi.request should throw on non-2xx; if not, validate here
  if (!json || !Array.isArray(json.articles)) {
    throw new Error('Malformed response from news provider');
  }
  return json;
};

const mapArticle = (article) => ({
  title: article.title,
  description: article.description,
  content: article.content,
  url: article.url,
  image: article.image,
  // keep Date instance – your UI expects it
  publishedAt: new Date(article.publishedAt),
  source: {
    name: article.source?.name,
    url: article.source?.url,
  },
});

// Generic paginator for GNews (supports `page` or an auto-fetch `limit`)
async function pagedSearch({
  endpoint,
  baseParams,
  limit = 30,       // how many you finally want client-side
  pageSize = 10,    // how many to request per HTTP call (<=10 per GNews)
  page,             // if provided, returns only that page
}) {
  const finalPageSize = Math.min(pageSize, GNEWS_HARD_MAX);

  // If caller passed an explicit page, return exactly that page (no auto-loop)
  if (typeof page === 'number') {
    const json = await makeNewsRequest(endpoint, {
      ...baseParams,
      max: finalPageSize,
      page,
    });
    return json.articles.map(mapArticle);
  }

  // Auto-paginate until we reach `limit` or run out of data
  const out = [];
  let currentPage = 1;
  while (out.length < limit) {
    const json = await makeNewsRequest(endpoint, {
      ...baseParams,
      max: finalPageSize,
      page: currentPage,
    });

    const mapped = json.articles.map(mapArticle);
    out.push(...mapped);

    // Stop when we got fewer than the page size (no more pages)
    if (mapped.length < finalPageSize) break;

    currentPage += 1;
  }

  return out.slice(0, limit);
}

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------
export const newsApi = {
  /**
   * Fetch the latest crypto news with optional pagination & date filters.
   *
   * @param {Object} options
   * @param {string} [options.lang='en']
   * @param {string} [options.country]
   * @param {number} [options.limit=30]     - final number of articles to return (auto-paginates)
   * @param {number} [options.pageSize=10]  - per-request size (<=10 on GNews)
   * @param {number} [options.page]         - fetch ONLY this page (no auto-pagination)
   * @param {string} [options.from]         - ISO date
   * @param {string} [options.to]           - ISO date
   * @param {number} [options.days]         - shortcut: now - days -> from
   * @param {string} [options.sortby='publishedAt']
   */
  getLatestNews: async (options = {}) => {
    try {
      const {
        lang = 'en',
        country,
        limit = 30,
        pageSize = 10,
        page,
        from,
        to,
        days,
        sortby = 'publishedAt',
      } = options;

      const baseParams = {
        q: DEFAULT_QUERY,
        lang,
        sortby,
        max: Math.min(pageSize, GNEWS_HARD_MAX),
      };

      if (country) baseParams.country = country;

      // Date filters (GNews supports from/to)
      if (days && !from) {
        const d = new Date();
        d.setDate(d.getDate() - Number(days));
        baseParams.from = d.toISOString();
      } else if (from) {
        baseParams.from = from;
      }
      if (to) baseParams.to = to;

      const articles = await pagedSearch({
        endpoint: 'search',
        baseParams,
        limit,
        pageSize,
        page,
      });

      return articles;
    } catch (error) {
      console.error('Error fetching crypto news:', error);
      throw new Error('Failed to fetch cryptocurrency news.');
    }
  },

  /**
   * Search for crypto news with pagination/date filters.
   */
  searchNews: async (query, options = {}) => {
    try {
      const {
        lang = 'en',
        country,
        limit = 30,
        pageSize = 10,
        page,
        from,
        to,
        days,
        sortby = 'publishedAt',
      } = options;

      const baseParams = {
        q: `${query} AND (${DEFAULT_QUERY})`,
        lang,
        sortby,
        max: Math.min(pageSize, GNEWS_HARD_MAX),
      };

      if (country) baseParams.country = country;

      if (days && !from) {
        const d = new Date();
        d.setDate(d.getDate() - Number(days));
        baseParams.from = d.toISOString();
      } else if (from) {
        baseParams.from = from;
      }
      if (to) baseParams.to = to;

      const articles = await pagedSearch({
        endpoint: 'search',
        baseParams,
        limit,
        pageSize,
        page,
      });

      return articles;
    } catch (error) {
      console.error('Error searching news:', error);
      throw new Error(`Failed to search news for "${query}".`);
    }
  },

  /**
   * Top headlines (still capped by GNews to 10 per request). Adds pagination.
   */
  getTopHeadlines: async (options = {}) => {
    try {
      const {
        topic,
        lang = 'en',
        country,
        limit = 20,
        pageSize = 10,
        page,
      } = options;

      const baseParams = {
        lang,
        max: Math.min(pageSize, GNEWS_HARD_MAX),
      };

      if (topic) baseParams.topic = topic;
      if (country) baseParams.country = country;

      const articles = await pagedSearch({
        endpoint: 'top-headlines',
        baseParams,
        limit,
        pageSize,
        page,
      });

      return articles;
    } catch (error) {
      console.error('Error fetching top headlines:', error);
      throw new Error('Failed to fetch top headlines.');
    }
  },

  /**
   * Get news for a specific coin.
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
   * Get category news.
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
   * "Breaking" = last 24h.
   */
  getBreakingNews: async (options = {}) => {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      return await newsApi.getLatestNews({
        ...options,
        from: yesterday.toISOString(),
        sortby: 'publishedAt',
      });
    } catch (error) {
      console.error('Error fetching breaking news:', error);
      throw new Error('Failed to fetch breaking cryptocurrency news.');
    }
  },
};

// ------------------------------------------------------------------
// Utils you already had (kept)
// ------------------------------------------------------------------
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
