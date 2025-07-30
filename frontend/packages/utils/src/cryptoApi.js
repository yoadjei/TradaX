import { externalApi } from './api';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const COINGECKO_API_KEY = 'key'
class RateLimit {
  constructor(requestsPerMinute = 30) {
    this.requests = [];
    this.maxRequests = requestsPerMinute;
  }

  async waitIfNeeded() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    this.requests = this.requests.filter(time => time > oneMinuteAgo);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = 60000 - (now - oldestRequest) + 1000;

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(now);
  }
}

const rateLimiter = new RateLimit(30);

const makeRequest = async (url) => {
  await rateLimiter.waitIfNeeded();

  const headers = {
    'x-cg-demo-api-key': COINGECKO_API_KEY,
    'Accept': 'application/json'
  };

  return await externalApi.request(url, { headers });
};

export const cryptoApi = {
  async getTopCoins(limit = 10) {
    try {
      const url = `${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false&price_change_percentage=24h`;
      const data = await makeRequest(url);

      return data.map(coin => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        priceUsd: coin.current_price,
        marketCapUsd: coin.market_cap,
        volumeUsd24Hr: coin.total_volume,
        changePercent24Hr: coin.price_change_percentage_24h,
        image: coin.image, // ✅ image included
        market_cap_rank: coin.market_cap_rank
      }));
    } catch (error) {
      console.error('Error fetching top coins:', error);
      throw new Error('Failed to fetch cryptocurrency market data');
    }
  },

  async getCoinDetails(coinId) {
    try {
      const url = `${COINGECKO_BASE_URL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
      const data = await makeRequest(url);

      return {
        id: data.id,
        symbol: data.symbol,
        name: data.name,
        priceUsd: data.market_data.current_price.usd,
        marketCapUsd: data.market_data.market_cap.usd,
        volumeUsd24Hr: data.market_data.total_volume.usd,
        changePercent24Hr: data.market_data.price_change_percentage_24h,
        supply: data.market_data.circulating_supply,
        maxSupply: data.market_data.max_supply,
        description: data.description?.en || '',
        image: data.image?.large || '',
        market_cap_rank: data.market_cap_rank,
        ath: data.market_data.ath.usd,
        atl: data.market_data.atl.usd
      };
    } catch (error) {
      console.error('Error fetching coin details:', error);
      throw new Error(`Failed to fetch details for ${coinId}`);
    }
  },

  async getPriceHistory(coinId, days = 7) {
    try {
      const url = `${COINGECKO_BASE_URL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
      const data = await makeRequest(url);

      return data.prices.map(entry => ({
        timestamp: new Date(entry[0]),
        price: entry[1]
      }));
    } catch (error) {
      console.error('Error fetching price history:', error);
      throw new Error(`Failed to fetch price history for ${coinId}`);
    }
  },

  async getOHLCData(coinId, days = 7) {
    try {
      const url = `${COINGECKO_BASE_URL}/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
      const data = await makeRequest(url);

      return data.map(entry => ({
        timestamp: new Date(entry[0]),
        open: entry[1],
        high: entry[2],
        low: entry[3],
        close: entry[4]
      }));
    } catch (error) {
      console.error('Error fetching OHLC data:', error);
      throw new Error(`Failed to fetch OHLC data for ${coinId}`);
    }
  },

  async getTrendingCoins() {
    try {
      const url = `${COINGECKO_BASE_URL}/search/trending`;
      const data = await makeRequest(url);

      return data.coins.map(item => ({
        id: item.item.id,
        name: item.item.name,
        symbol: item.item.symbol,
        market_cap_rank: item.item.market_cap_rank,
        thumb: item.item.thumb,
        small: item.item.small,
        large: item.item.large,
        price_btc: item.item.price_btc,
        score: item.item.score
      }));
    } catch (error) {
      console.error('Error fetching trending coins:', error);
      throw new Error('Failed to fetch trending cryptocurrencies');
    }
  },

  async searchCoins(query) {
    try {
      const url = `${COINGECKO_BASE_URL}/search?query=${encodeURIComponent(query)}`;
      const data = await makeRequest(url);

      return data.coins.map(coin => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        market_cap_rank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large
      }));
    } catch (error) {
      console.error('Error searching coins:', error);
      throw new Error(`Failed to search for "${query}"`);
    }
  },

  async getGlobalData() {
    try {
      const url = `${COINGECKO_BASE_URL}/global`;
      const data = await makeRequest(url);

      return {
        active_cryptocurrencies: data.data.active_cryptocurrencies,
        markets: data.data.markets,
        total_market_cap: data.data.total_market_cap,
        total_volume: data.data.total_volume,
        market_cap_percentage: data.data.market_cap_percentage,
        market_cap_change_percentage_24h_usd: data.data.market_cap_change_percentage_24h_usd,
        updated_at: data.data.updated_at
      };
    } catch (error) {
      console.error('Error fetching global data:', error);
      throw new Error('Failed to fetch global cryptocurrency market data');
    }
  },

  async getSimplePrices(coinIds, currencies = ['usd']) {
    try {
      const ids = Array.isArray(coinIds) ? coinIds.join(',') : coinIds;
      const vs_currencies = Array.isArray(currencies) ? currencies.join(',') : currencies;

      const url = `${COINGECKO_BASE_URL}/simple/price?ids=${ids}&vs_currencies=${vs_currencies}&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
      const data = await makeRequest(url);

      return data;
    } catch (error) {
      console.error('Error fetching simple prices:', error);
      throw new Error('Failed to fetch simple prices');
    }
  }
};

// Utility functions remain unchanged but fixed
export const formatPrice = (price, currency = '$') => {
  if (typeof price !== 'number' || isNaN(price)) {
    return `${currency}0.00`;
  }

  if (price >= 1) {
    return `${currency}${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  } else {
    return `${currency}${price.toFixed(8)}`;
  }
};

export const formatPercentageChange = (percentage) => {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return { text: '0.00%', isPositive: false };
  }

  const isPositive = percentage >= 0;
  const formatted = Math.abs(percentage).toFixed(2);

  return {
    text: `${isPositive ? '+' : '-'}${formatted}%`,
    isPositive
  };
};

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
