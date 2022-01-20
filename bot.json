require('dotenv').config();
const TeleBot = require('telebot');
const Binance = require('node-binance-api');
const CoinMarketCap = require('coinmarketcap-api');

const bot = new TeleBot(process.env.TELEGRAM_TOKEN);
const binance = new Binance({
  APIKEY: process.env.BINANCE_KEY,
  APISECRET: process.env.BINANCE_SECRET,
});

const cmcClient = new CoinMarketCap(process.env.COINMARKETCAP_KEY);

const TOO_MUCH = "You're using the bot too much!";
const NO_CURRENCY = 'No currency found with that name.';
const NO_TICKER = 'Ticker not found.';
const RANK_NOT_IN_RANGE = 'Given rank must be greater than 1.';
const NO_CURRENCY_RANK = 'No currency found with that rank.';
const DEPRECATED = 'Deprecated';

let cache = { global: {}, bin: {} };

bot.on('/start', (msg) => {
  msg.reply.text(
    '/info <symbol> for information on the coin with that ticker symbol\n' +
      '/info <rank> for information on the coin with that rank\n' +
      '/global for total market information\n' +
      '/<ticker> for latest Binance ticker price\n' +
      '/chart <name> for chart on historical prices on the coin with that name'
  );
});

// Ticker information from CoinMarketCap
bot.on(/^\/info (.+)$/i, async (msg, props) => {
  updateCalls(msg);
  const text = props.match[1].substring(5);
  // Checks if the same argument has been passed into the command in the last 5 minutes
  if (cache[text] && isValidCache(cache[text], cache[text].last_updated)) {
    return msg.reply.text(formatInfo(cache[text]), { asReply: true });
  } else {
    if (isNaN(text)) {
      const symbol = text.toUpperCase();
      cmcClient.getQuotes({ symbol: symbol }).then((info) => {
        console.log(info);
        if (!('data' in info && symbol in info.data))
          return msg.reply.text(NO_CURRENCY, { asReply: true });
        const data = info.data[symbol];
        cache[symbol] = data;
        return msg.reply.text(formatInfo(data), { asReply: true });
      });
    } else {
      const rank = parseInt(text);
      if (rank === 0) return msg.reply.text(RANK_NOT_IN_RANGE, { asReply: true });
      cmcClient.getTickers({ start: rank, limit: 1 }).then((info) => {
        console.log(info);
        if (info.data.length === 0) return msg.reply.text(NO_CURRENCY_RANK, { asReply: true });
        const data = info.data[0];
        cache[text] = data;
        return msg.reply.text(formatInfo(data), { asReply: true });
      });
    }
  }
});

// Total market information from CoinMarketCap
bot.on('/global', async (msg) => {
  updateCalls(msg);
  // Checks if global command has been called in last 5 minutes
  if (isValidCache(cache.global, cache.global.last_updated)) {
    return msg.reply.text(formatGlobalInfo(cache.global), { asReply: true });
  }
  cmcClient.getGlobal().then((info) => {
    console.log(info);
    cache.global = info.data;
    return msg.reply.text(formatGlobalInfo(info.data), { asReply: true });
  });
});

// Latest exchange price from Binance
bot.on(/^\/(.+)$/i, async (msg, props) => {
  const text = props.match[1].toLowerCase();
  if (isValidTickerText(props, text)) {
    updateCalls(msg);
    // Checks if command has been called in the past 5 minutes
    if (isValidCache(cache.bin.data, cache.bin.last_updated)) {
      return msg.reply.text(formatBinanceInfo(cache.bin.data, text.toUpperCase()), {
        asReply: true,
      });
    } else {
      binance.prices((_, ticker) => {
        cache.bin.last_updated = new Date();
        cache.bin.data = ticker;
        console.log('Called Binance API');
        return msg.reply.text(formatBinanceInfo(ticker, text.toUpperCase()), { asReply: true });
      });
    }
  }
});

bot.on(/^\/chart (.+)$/i, (msg) => {
  return msg.reply.text(DEPRECATED, { asReply: true });
});

bot.start();

// Formats the output of the json for better readability
function formatInfo(info) {
  let output = info.name + ' (' + info.symbol + ')\n';
  output += 'CoinMarketCap ID: ' + info.id + '\n';
  output += 'CoinMarketCap Rank: ' + info.cmc_rank + '\n';
  output += 'https://coinmarketcap.com/currencies/' + info.slug + '/\n\n';

  const priceInfo = info.quote.USD;
  output += 'Price USD: $' + formatNum(priceInfo.price) + '\n';
  output += 'Market Cap: $' + formatNum(priceInfo.market_cap) + '\n';
  output += '24h Volume: $' + formatNum(priceInfo.volume_24h) + '\n';
  output += 'Available Supply: ' + formatNum(info.circulating_supply) + '\n';
  output += 'Total Supply: ' + formatNum(info.total_supply) + '\n';
  if (info.max_supply) {
    output += 'Maximum Supply: ' + formatNum(info.max_supply) + '\n';
  }

  output += '\nChange 1h: ' + formatNum(priceInfo.percent_change_1h) + '%\n';
  if ('percent_change_24h' in priceInfo) {
    output += 'Change 24h: ' + formatNum(priceInfo.percent_change_24h) + '%\n';
  }
  if ('percent_change_7d' in priceInfo) {
    output += 'Change 7d: ' + formatNum(priceInfo.percent_change_7d) + '%\n';
  }
  output += '\n';

  return output + 'Last Updated: ' + new Date(info.last_updated).toString();
}

// Formats the output of the json for global CMC data
function formatGlobalInfo(info) {
  const marketInfo = info.quote.USD;
  let output =
    'Total Market Cap: $' + parseInt(marketInfo.total_market_cap).toLocaleString() + '\n';
  output += 'Total 24h Volume: $' + parseInt(marketInfo.total_volume_24h).toLocaleString() + '\n';
  output +=
    'Altcoin Market Cap: $' + parseInt(marketInfo.altcoin_market_cap).toLocaleString() + '\n';
  output +=
    'Altcoin 24h Volume: $' + parseInt(marketInfo.altcoin_volume_24h).toLocaleString() + '\n';
  output += 'Bitcoin Percentage of Market Cap: ' + info.btc_dominance + '%\n';
  output += 'Ethereum Percentage of Market Cap: ' + info.eth_dominance + '%\n\n';

  output += 'Number of Active Currencies: ' + info.active_cryptocurrencies.toLocaleString() + '\n';
  output += 'Number of Total Currencies: ' + info.total_cryptocurrencies.toLocaleString() + '\n';
  output += 'Number of Active Markets: ' + info.active_market_pairs.toLocaleString() + '\n';
  output += 'Number of Active Exchanges: ' + info.active_exchanges.toLocaleString() + '\n';
  output += 'Number of Total Exchanges: ' + info.total_exchanges.toLocaleString() + '\n\n';

  output += 'https://coinmarketcap.com/charts/' + '\n\n';

  return output + 'Last Updated: ' + new Date(info.last_updated).toString();
}

// Formats the output for Binance exchange price
function formatBinanceInfo(ticker, text) {
  // The keys in the ticker object are exchanges in format equivalent to VENETH
  const tradingPairs = ['ETH', 'BTC', 'BNB'];
  let output = '';
  tradingPairs.forEach((item) => {
    const exc = text + item;
    // Checks if there exists an exchange in the ticker with each of the pairs
    if (ticker[exc]) {
      output += ticker[exc] + ' ' + exc.replace(text, text + '/') + ' ';
      output += '($' + formatBin(ticker[exc], ticker[item + 'USDT']) + ')\n';
    }
  });
  if (ticker[text + 'USDT']) {
    output += formatNum(ticker[text + 'USDT']) + ' ' + text + '/USDT\n';
  }
  return output == '' ? NO_TICKER : output;
}

// Check if valid ticker given for /<ticker>
function isValidTickerText(props, text) {
  return (
    !text.startsWith('global') &&
    !text.startsWith('info') &&
    !props.match[0].startsWith('/chart') &&
    text.match(/^[a-zA-Z]+$/) &&
    text.length < 5
  );
}

// Check if the cache is valid
function isValidCache(data, lastUpdated) {
  return data && Math.floor(((new Date() - lastUpdated) / 60000) % 60) < 5;
}

// Formats number string
function formatNum(str) {
  return parseFloat(str).toLocaleString();
}

// Formats the displayed estimated dollar price for Binance exchange values
function formatBin(price1, price2) {
  return (parseFloat(price1) * parseFloat(price2)).toLocaleString();
}

// Checks for more than 30 calls a minute and updates number of calls
function updateCalls(msg) {
  if (calls > 10) {
    return msg.reply.text(TOO_MUCH, { asReply: true });
  }
  calls++;
}

let calls = 0;
resetNumCalls();
setInterval(resetNumCalls, 60000);
function resetNumCalls() {
  console.log('Resetting number of calls at ' + new Date().toString());
  calls = 0;
}
