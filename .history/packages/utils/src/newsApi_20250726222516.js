// @tradax/utils/newsApi.js
import { externalApi } from './api';

const GNEWS_BASE_URL = 'https://gnews.io/api/v4';
const GNEWS_API_KEY = 'b94bb9dbcc8ca93ac8b953ad25f75595';

// GNews free tier: 100 requests/day, 10 articles per request. Docs confirm pagination via `page`. 
// (We’ll auto-paginate when max > 10, but still respect the daily limit.)
class NewsRateLimit {
  constructor(requestsPerDay = 100) {
    this.requests = [];
    this.maxRequests = requestsPerDay;
  }

  async waitIfNeeded() {
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    this.requests = this.requests.filter(time => time > oneDayAgo);
    if (this.requests.length >= this.maxRequests) {
      throw new Error('Daily API limit reached. Please try again tomorrow.');
    }
    this.requests.push(now);
  }
}

const newsRateLimit = new NewsRateLimit(100);

const makeNewsRequest = async (endpoint, params = {}) => {
  await newsRateLimit.waitIfNeeded();

  const searchParams = new URLSearchParams({
    apikey: GNEWS_API_KEY, // your current code uses `apikey`; keeping it to avoid breaking your backend
    // (GNews docs show `token`; switch when you migrate) 
    ...params,
  });

  const url = `${GNEWS_BASE_URL}/${endpoint}?${searchParams.toString()}`;
  return await externalApi.request(url);
};

// ---- helpers ----
const faviconFrom = (url) => {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${u.origin}`;
  } catch {
    return null;
  }
};

const detectCategory = (title = '', desc = '') => {
  const t = `${title} ${desc}`.toLowerCase();
  if (t.includes('bitcoin') || t.includes('btc')) return 'BTC';
  if (t.includes('ethereum') || t.includes('eth')) return 'ETH';
  if (t.includes('defi')) return 'DeFi';
  if (t.includes('nft')) return 'NFT';
  if (t.includes('regulation') || t.includes('sec')) return 'Regulation';
  if (t.includes('listing') || t.includes('lists')) return 'Listings';
  if (t.includes('meme')) return 'Memes';
  return 'General';
};

const normalizeArticle = (article, idx) => {
  const publishedAt = new Date(article.publishedAt);
  const image = article.image || faviconFrom(article.url) || null;

  return {
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.url,
    image,
    publishedAt,
    source: {
      name: article.source?.name,
      url: article.source?.url,
    },
    category: detectCategory(article.title, article.description),
    score: (60 - idx), // simple trending score; tweak if you store likes/views
  };
};

const dedupeAndTrim = (list, max) => {
  const seen = new Set();
  const out = [];
  for (const a of list) {
    const key = a.url || `${a.title}-${a.publishedAt?.toISOString?.()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
    if (out.length >= max) break;
  }
  return out;
};

// ---- exported api ----
export const newsApi = {
  getLatestNews: async (options = {}) => {
    const {
      lang = 'en',
      country,
      max = 10,
    } = options;

    const perPage = Math.min(10, max); // free tier limit
    const pages = Math.ceil(max / perPage);

    const all = [];
    for (let page = 1; page <= pages; page++) {
      const params = {
        q: 'cryptocurrency OR bitcoin OR ethereum OR crypto OR blockchain',
        lang,
        max: perPage,
        page, // GNews supports pagination
      };
      if (country) params.country = country;

      const res = await makeNewsRequest('search', params);
      const articles = Array.isArray(res?.articles) ? res.articles : [];
      articles.forEach((a, i) => all.push(normalizeArticle(a, i)));
      if (articles.length < perPage) break; // no more pages
    }

    const deduped = dedupeAndTrim(
      all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
      max
    );
    return deduped;
  },

  searchNews: async (query, options = {}) => {
    const {
      lang = 'en',
      country,
      max = 10,
      from,
      to,
      sortby = 'publishedAt',
    } = options;

    const perPage = Math.min(10, max);
    const pages = Math.ceil(max / perPage);

    const all = [];
    for (let page = 1; page <= pages; page++) {
      const params = {
        q: `${query} AND (cryptocurrency OR bitcoin OR ethereum OR crypto OR blockchain)`,
        lang,
        max: perPage,
        sortby,
        page,
      };
      if (country) params.country = country;
      if (from) params.from = from;
      if (to) params.to = to;

      const res = await makeNewsRequest('search', params);
      const articles = Array.isArray(res?.articles) ? res.articles : [];
      articles.forEach((a, i) => all.push(normalizeArticle(a, i)));
      if (articles.length < perPage) break;
    }

    return dedupeAndTrim(
      all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
      max
    );
  },

  getTopHeadlines: async (options = {}) => {
    const { topic, lang = 'en', country, max = 10 } = options;

    const perPage = Math.min(10, max);
    const pages = Math.ceil(max / perPage);

    const all = [];
    for (let page = 1; page <= pages; page++) {
      const params = { lang, max: perPage, page };
      if (topic) params.topic = topic;
      if (country) params.country = country;

      const res = await makeNewsRequest('top-headlines', params);
      const articles = Array.isArray(res?.articles) ? res.articles : [];
      articles.forEach((a, i) => all.push(normalizeArticle(a, i)));
      if (articles.length < perPage) break;
    }

    return dedupeAndTrim(
      all.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)),
      max
    );
  },

  getCoinNews: async (coinName, options = {}) => {
    const searchQuery = `${coinName} cryptocurrency`;
    return await newsApi.searchNews(searchQuery, options);
  },

  getCategoryNews: async (category, options = {}) => {
    const searchQuery = `${category} cryptocurrency blockchain`;
    return await newsApi.searchNews(searchQuery, options);
  },

  getBreakingNews: async (options = {}) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return await newsApi.getLatestNews({
      ...options,
      from: yesterday.toISOString(),
      sortby: 'publishedAt',
    });
  },
};

// Utilities unchanged (kept for your other screens)
export const formatNewsDate = (date) => {
  if (!(date instanceof Date)) return 'Unknown date';
  const now = new Date();
  const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
  if (diffInHours < 1) {
    const mins = Math.floor((now - date) / (1000 * 60));
    return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(diffInHours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
};

export const truncateContent = (content, maxLength = 150) => {
  if (!content || content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
};

export const extractKeywords = (title, description) => {
  const text = `${title} ${description}`.toLowerCase();
  const cryptoKeywords = [
    'bitcoin', 'btc', 'ethereum', 'eth', 'cryptocurrency', 'crypto',
    'blockchain', 'defi', 'nft', 'altcoin', 'mining', 'trading',
    'regulation', 'sec', 'adoption', 'price', 'market', 'bull', 'bear'
  ];
  return cryptoKeywords.filter(k => text.includes(k));
};
