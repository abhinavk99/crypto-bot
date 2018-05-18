require('dotenv').config();
const TeleBot = require('telebot');
const binance = require('node-binance-api');
const CoinMarketCap = require('coinmarketcap-api');
// const webshot = require('webshot');
const fs = require('fs');

const bot = new TeleBot(process.env.TELEGRAM_TOKEN);
binance.options({
  'APIKEY': process.env.BINANCE_KEY,
  'APISECRET': process.env.BINANCE_SECRET
});

const cmcClient = new CoinMarketCap();

// 10 API calls a minute are allowed
let calls = 0;

// Constants for bot error message responses
const TOO_MUCH = 'You\'re using the bot too much!';  // Prevent overuse of bot calls
const NO_CURRENCY = 'No currency found with that name.';  // Currency not found in /info <name>
const NOT_NUMBER = 'A ticker can\'t be a number.';  // Ticker input was a number in /<ticker>
const NO_TICKER = 'Ticker not found.'  // Ticker not found in /<ticker>
const RANK_NOT_IN_RANGE = 'Given rank must be between 1 and 100.' // Max limit is 100

const cacheFile = 'cache.json';

bot.on('/start', msg => {
  msg.reply.text('/info <symbol> for information on the coin with that ticker symbol\n'
    + '/info <rank> for information on the coin with that rank\n'
    + '/global for total market information\n'
    + '/<ticker> for latest Binance ticker price\n'
    + '/chart <name> for chart on historical prices on the coin with that name');
});

// Ticker information from CoinMarketCap
bot.on(/^\/info (.+)$/i, async (msg, props) => {
  updateCalls(msg);
  const text = props.match[1].substring(5);
  let cache = await readCache();
  // Checks if the same argument has been passed into the command in the last 5 minutes
  if (isValidCache(cache[text], cache[text].lastUpdated)) {
    return msg.reply.text(formatInfo(cache[text]), {asReply: true});
  } else {
    if (isNaN(text)) {
      cmcClient.getListings().then(listings => {
        // Look for currency with that symbol in the listings
        const listObj = listings.data.find(listing => listing.symbol === text.toUpperCase());
        // Listing of that currency not found
        if (!listObj)
          return msg.reply.text(NO_CURRENCY, {asReply: true});
        // Listing of that currency found
        const id = listObj.id;

        cmcClient.getTicker({id: id}).then(info => {
          console.log(info);
          cache[text] = info.data;
          writeCache(cache);
          return msg.reply.text(formatInfo(info.data), {asReply: true});
        });
      });
    } else {
      const rank = parseInt(text);
      if (rank > 100 || rank === 0)
        return msg.reply.text(RANK_NOT_IN_RANGE, {asReply: true});
      cmcClient.getTicker({limit: rank}).then(info => {
        // Info is an array of JS objects
        console.log(info);
        const data = Object.values(info.data).find(res => res.rank === rank);
        cache[text] = data;
        writeCache(cache);
        return msg.reply.text(formatInfo(data),
          {asReply: true});
      });
    }
  }
});

// Total market information from CoinMarketCap
bot.on('/global', async msg => {
  // Current time
  const d = new Date();
  updateCalls(msg);
  let cache = await readCache();
  // Checks if global command has been called in last 5 minutes
  if (isValidCache(cache.global, cache.global.lastUpdated)) {
    return msg.reply.text(formatGlobalInfo(cache.global), {asReply: true});
  }
  cmcClient.getGlobal().then((info) => {
    // Info is a JS object
    console.log(info);
    cache.global = info.data;
    writeCache(cache);
    return msg.reply.text(formatGlobalInfo(info.data), {asReply: true});
  });
});

// Latest exchange price from Binance
bot.on(/^\/(.+)$/i, async (msg, props) => {
  const text = props.match[1].toLowerCase();
  // Accounts for not responding to one of the other commands
  if (isValidTickerText(props, text)) {
    updateCalls(msg);
    let cache = await readCache();
    // Checks if command has been called in the past 5 minutes
    if (isValidCache(cache.bin.data, cache.bin.lastUpdated)) {
      return msg.reply.text(formatBinanceInfo(cache.bin.data, text.toUpperCase()), 
        {asReply: true});
    } else {
      if (isNaN(text)) {
        binance.prices((ticker) => {
          cache.bin.lastUpdated = new Date();
          cache.bin.data = ticker;
          writeCache(cache);
          console.log('Called Binance API');
          return msg.reply.text(formatBinanceInfo(ticker, text.toUpperCase()), 
            {asReply: true});
        });
      } else {
        return msg.reply.text(NOT_NUMBER, {asReply: true});
      }
    }
  } 
});

// Check if valid ticker given for /<ticker>
function isValidTickerText(props, text) {
  return !text.startsWith('global')
    && !text.startsWith('info')
    && !props.match[0].startsWith('/chart')
    && text.match(/^[a-zA-Z]+$/)
    && text.length < 5;
}

// Check if the cache is valid
function isValidCache(data, lastUpdated) {
  return data && Math.floor((new Date() - lastUpdated) / 60000 % 60) < 5;
}

bot.on(/^\/chart (.+)$/i, (msg, props) => {
  return msg.reply.text('Deprecated', {asReply: true});

  // if (calls > 10) {
  //   return msg.reply.text(TOO_MUCH, { asReply: true });
  // }
  // calls++;
  // const text = props.match[1].toLowerCase();

  // webshot(`https://coinmarketcap.com/currencies/${text}/#charts`, `${text}.png`, {
  //     shotSize: { width: 'window', height: 630 },
  //     shotOffset: { left: 35, right: 70, top: 690, bottom: 0 }
  //   }, err => {
  //     return msg.reply.photo(`${text}.png`, {asReply: true});
  // });
});

bot.start();

// Formats the output of the json for better readability
function formatInfo(info) {
  let output = info.name + ' (' + info.symbol + ')\n';
  output += ('CoinMarketCap ID: ' + info.id + '\n')
  output += ('CoinMarketCap Rank: ' + info.rank + '\n');
  output += ('https://coinmarketcap.com/currencies/' + info.website_slug + '/\n\n');

  const priceInfo = info.quotes.USD;
  output += ('Price USD: $' + formatNum(priceInfo.price) + '\n');
  output += ('Market Cap: $' + formatNum(priceInfo.market_cap) + '\n');
  output += ('24h Volume: $' + formatNum(priceInfo.volume_24h) + '\n');
  output += ('Available Supply: ' + formatNum(info.circulating_supply) + '\n');
  output += ('Total Supply: ' + formatNum(info.total_supply)+ '\n');
  if (info.max_supply) {
    output += ('Maximum Supply: ' + formatNum(info.max_supply) + '\n');
  }

  output += ('\nChange 1h: ' + formatNum(priceInfo.percent_change_1h) + '%\n');
  output += ('Change 24h: ' + formatNum(priceInfo.percent_change_24h) + '%\n');
  output += ('Change 7d: ' + formatNum(priceInfo.percent_change_7d) + '%\n\n');

  return output + 'Last Updated: '
    + new Date(parseInt(info.last_updated) * 1000).toString();
}

// Formats the output of the json for global CMC data
function formatGlobalInfo(info) {
  const marketInfo = info.quotes.USD;
  let output = 'Total Market Cap: $'
    + parseInt(marketInfo.total_market_cap).toLocaleString() + '\n';
  output += ('Total 24h Volume: $'
    + parseInt(marketInfo.total_volume_24h).toLocaleString() + '\n');
  output += ('Bitcoin Percentage of Market Cap: '
    + info.bitcoin_percentage_of_market_cap + '%\n\n');

  output += ('Number of Active Currencies: ' + info.active_cryptocurrencies + '\n');
  output += ('Number of Active Markets: ' + info.active_markets + '\n\n');

  output += ('https://coinmarketcap.com/charts/' + '\n\n');

  return output + 'Last Updated: '
    + new Date(parseInt(info.last_updated) * 1000).toString();
}

// Formats the output for Binance exchange price
function formatBinanceInfo(ticker, text) {
  // The keys in the ticker object are exchanges in format equivalent to VENETH
  const tradingPairs = ['ETH', 'BTC', 'BNB'];
  let output = '';
  tradingPairs.forEach(item => {
    const exc = text + item;
    // Checks if there exists an exchange in the ticker with each of the pairs
    if (ticker[exc]) {
      output += (ticker[exc] + ' ' + exc.replace(text, text + '/') + ' ');
      output += ('($' + formatBin(ticker[exc], ticker[item + 'USDT']) + ')\n');
    }
  });
  if (ticker[text + 'USDT']) {
    output += (formatNum(ticker[text + 'USDT']) + ' ' + text + '/USDT\n');
  }
  return ((output == '') ? NO_TICKER : output);
}

// Formats number string
function formatNum(str) {
  return parseFloat(str).toLocaleString();
}

// Formats the displayed estimated dollar price for Binance exchange values
function formatBin(price1, price2) {
  return (parseFloat(price1) * parseFloat(price2)).toLocaleString();
}

// Reads the current JSON cache
function readCache() {
  return new Promise((resolve, reject) => {
    fs.readFile(cacheFile, (err, rawCache) => {
      if (err) reject(err);
      resolve(JSON.parse(rawCache));
    });
  });
}

// Writes JSON to cache file
function writeCache(cache) {
  fs.writeFile(cacheFile, JSON.stringify(cache, null, 4), error => {
    if (error) throw error;
  });
}

// Checks for more than 30 calls a minute and updates number of calls
function updateCalls(msg) {
  if (calls > 10) {
    return msg.reply.text(TOO_MUCH, { asReply: true });
  }
  calls++;
}

// Resets number of calls to 0 every minute
resetNumCalls();
setInterval(resetNumCalls, 60000);
function resetNumCalls() {
  console.log('Resetting number of calls at ' + new Date().toString());
  calls = 0;
}

// Resets the caches every 2 hours
// resetCaches();
// setInterval(resetCaches, 7200000);
// function resetCaches() {
//   console.log('Resetting caches at ' + new Date().toString());
//   cache = {};
//   bin = [];
//   // Deletes all files ending with .png
//   fs.readdir('./', (err, files) => {
//     if (err) throw err;

//     for (const file of files) {
//       if (file.endsWith('.png')) {
//         fs.unlink(file, err => {
//           if (err) throw err;
//         });
//       }
//     }
//   });
// }