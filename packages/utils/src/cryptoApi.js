import { externalApi } from './api';

// CoinGecko API base URL (free tier)
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Rate limiting helper
class RateLimit {
  constructor(requestsPerMinute = 50) {
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
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimit(50); // CoinGecko free tier limit

/**
 * CoinGecko API client for cryptocurrency data
 */
export const cryptoApi = {
  /**
   * Get top cryptocurrencies by market cap
   * @param {number} limit - Number of coins to fetch (default: 10)
   * @param {string} currency - Currency for price data (default: 'usd')
   * @returns {Promise<Array>}
   */
  async getTopCoins(limit = 10, currency = 'usd') {
    try {
      await rateLimiter.waitIfNeeded();
      
      const url = `${COINGECKO_BASE_URL}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`;
      
      const data = await externalApi.request(url);
      
      return data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        current_price: coin.current_price,
        market_cap: coin.market_cap,
        market_cap_rank: coin.market_cap_rank,
        total_volume: coin.total_volume,
        high_24h: coin.high_24h,
        low_24h: coin.low_24h,
        price_change_24h: coin.price_change_24h,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        market_cap_change_24h: coin.market_cap_change_24h,
        market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h,
        circulating_supply: coin.circulating_supply,
        total_supply: coin.total_supply,
        max_supply: coin.max_supply,
        ath: coin.ath,
        ath_change_percentage: coin.ath_change_percentage,
        ath_date: coin.ath_date,
        atl: coin.atl,
        atl_change_percentage: coin.atl_change_percentage,
        atl_date: coin.atl_date,
        last_updated: coin.last_updated,
      }));
    } catch (error) {
      console.error('Error fetching top coins:', error);
      throw new Error('Failed to fetch cryptocurrency market data');
    }
  },

  /**
   * Get detailed information about a specific cryptocurrency
   * @param {string} coinId - CoinGecko coin ID
   * @returns {Promise<Object>}
   */
  async getCoinDetails(coinId) {
    try {
      await rateLimiter.waitIfNeeded();
      
      const url = `${COINGECKO_BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
      
      const data = await externalApi.request(url);
      
      return {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        description: data.description?.en,
        image: data.image,
        market_cap_rank: data.market_cap_rank,
        market_data: {
          current_price: data.market_data.current_price,
          market_cap: data.market_data.market_cap,
          total_volume: data.market_data.total_volume,
          high_24h: data.market_data.high_24h,
          low_24h: data.market_data.low_24h,
          price_change_24h: data.market_data.price_change_24h,
          price_change_percentage_24h: data.market_data.price_change_percentage_24h,
          market_cap_change_24h: data.market_data.market_cap_change_24h,
          market_cap_change_percentage_24h: data.market_data.market_cap_change_percentage_24h,
          circulating_supply: data.market_data.circulating_supply,
          total_supply: data.market_data.total_supply,
          max_supply: data.market_data.max_supply,
          ath: data.market_data.ath,
          ath_change_percentage: data.market_data.ath_change_percentage,
          ath_date: data.market_data.ath_date,
          atl: data.market_data.atl,
          atl_change_percentage: data.market_data.atl_change_percentage,
          atl_date: data.market_data.atl_date,
        },
        last_updated: data.last_updated,
      };
    } catch (error) {
      console.error('Error fetching coin details:', error);
      throw new Error(`Failed to fetch details for ${coinId}`);
    }
  },

  /**
   * Get price history for a cryptocurrency
   * @param {string} coinId - CoinGecko coin ID
   * @param {number} days - Number of days of history (1, 7, 14, 30, 90, 180, 365, max)
   * @param {string} currency - Currency for price data (default: 'usd')
   * @returns {Promise<Array>}
   */
  async getPriceHistory(coinId, days = 7, currency = 'usd') {
    try {
      await rateLimiter.waitIfNeeded();
      
      const url = `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=${currency}&days=${days}&interval=${days <= 1 ? 'hourly' : 'daily'}`;
      
      const data = await externalApi.request(url);
      
      // Return price data points
      return data.prices.map(([timestamp, price]) => ({
        timestamp,
        price,
        date: new Date(timestamp),
      }));
    } catch (error) {
      console.error('Error fetching price history:', error);
      throw new Error(`Failed to fetch price history for ${coinId}`);
    }
  },

  /**
   * Get trending cryptocurrencies
   * @returns {Promise<Array>}
   */
  async getTrendingCoins() {
    try {
      await rateLimiter.waitIfNeeded();
      
      const url = `${COINGECKO_BASE_URL}/search/trending`;
      
      const data = await externalApi.request(url);
      
      return data.coins.map(item => ({
        id: item.item.id,
        coin_id: item.item.coin_id,
        name: item.item.name,
        symbol: item.item.symbol,
        market_cap_rank: item.item.market_cap_rank,
        thumb: item.item.thumb,
        small: item.item.small,
        large: item.item.large,
        slug: item.item.slug,
        price_btc: item.item.price_btc,
        score: item.item.score,
      }));
    } catch (error) {
      console.error('Error fetching trending coins:', error);
      throw new Error('Failed to fetch trending cryptocurrencies');
    }
  },

  /**
   * Search for cryptocurrencies
   * @param {string} query - Search query
   * @returns {Promise<Array>}
   */
  async searchCoins(query) {
    try {
      await rateLimiter.waitIfNeeded();
      
      const url = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`;
      
      const data = await externalApi.request(url);
      
      return data.coins.map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        market_cap_rank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large,
      }));
    } catch (error) {
      console.error('Error searching coins:', error);
      throw new Error(`Failed to search for "${query}"`);
    }
  },

  /**
   * Get current prices for multiple cryptocurrencies
   * @param {Array<string>} coinIds - Array of CoinGecko coin IDs
   * @param {string} currency - Currency for price data (default: 'usd')
   * @returns {Promise<Object>}
   */
  async getCurrentPrices(coinIds, currency = 'usd') {
    try {
      await rateLimiter.waitIfNeeded();
      
      const ids = coinIds.join(',');
      const url = `${COINGECKO_BASE_URL}/simple/price?ids=${ids}&vs_currencies=${currency}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`;
      
      const data = await externalApi.request(url);
      
      return data;
    } catch (error) {
      console.error('Error fetching current prices:', error);
      throw new Error('Failed to fetch current cryptocurrency prices');
    }
  },

  /**
   * Get global cryptocurrency market data
   * @returns {Promise<Object>}
   */
  async getGlobalData() {
    try {
      await rateLimiter.waitIfNeeded();
      
      const url = `${COINGECKO_BASE_URL}/global`;
      
      const data = await externalApi.request(url);
      
      return {
        active_cryptocurrencies: data.data.active_cryptocurrencies,
        upcoming_icos: data.data.upcoming_icos,
        ongoing_icos: data.data.ongoing_icos,
        ended_icos: data.data.ended_icos,
        markets: data.data.markets,
        total_market_cap: data.data.total_market_cap,
        total_volume: data.data.total_volume,
        market_cap_percentage: data.data.market_cap_percentage,
        market_cap_change_percentage_24h_usd: data.data.market_cap_change_percentage_24h_usd,
        updated_at: data.data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching global data:', error);
      throw new Error('Failed to fetch global cryptocurrency market data');
    }
  },
};

/**
 * Format price for display
 * @param {number} price - Price value
 * @param {string} currency - Currency symbol (default: '$')
 * @returns {string}
 */
export const formatPrice = (price, currency = '$') => {
  if (typeof price !== 'number' || isNaN(price)) {
    return `${currency}0.00`;
  }

  if (price >= 1) {
    return `${currency}${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } else {
    return `${currency}${price.toFixed(8)}`;
  }
};

/**
 * Format percentage change
 * @param {number} percentage - Percentage value
 * @returns {Object} Object with formatted text and color indication
 */
export const formatPercentageChange = (percentage) => {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return { text: '0.00%', isPositive: false };
  }

  const isPositive = percentage >= 0;
  const formatted = Math.abs(percentage).toFixed(2);
  
  return {
    text: `${isPositive ? '+' : '-'}${formatted}%`,
    isPositive,
  };
};

/**
 * Format large numbers (market cap, volume)
 * @param {number} number - Large number
 * @returns {string}
 */
export const formatLargeNumber = (number) => {
  if (typeof number !== 'number' || isNaN(number)) {
    return '0';
  }

  const abs = Math.abs(number);
  
  if (abs >= 1e12) {
    return `${(number / 1e12).toFixed(2)}T`;
  } else if (abs >= 1e9) {
    return `${(number / 1e9).toFixed(2)}B`;
  } else if (abs >= 1e6) {
    return `${(number / 1e6).toFixed(2)}M`;
  } else if (abs >= 1e3) {
    return `${(number / 1e3).toFixed(2)}K`;
  } else {
    return number.toFixed(2);
  }
};
