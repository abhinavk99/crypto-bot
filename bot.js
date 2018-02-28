const Config = require('./config.json');
const TeleBot = require('telebot');
const binance = require('node-binance-api');
const fetch = require('node-fetch');

const bot = new TeleBot(Config.telegramToken);
binance.options({
  'APIKEY': Config.binanceKey,
  'APISECRET': Config.binanceSecret
});

// 10 API calls a minute are allowed
var calls = 0;

// Base CoinMarketCap API url
const baseUrl = 'https://api.coinmarketcap.com/v1/';

// Caching CMC data to account for repeated calls
var cache = {};

// Caching Binance ticker data and time of most recent call
var bin = [];

// Constants for bot error message responses
const tooMuch = 'You\'re using the bot too much!';  // Prevent overuse of bot calls
const noCurrency = 'No currency found with that name.';  // Currency not found in /info <name>
const notNumber = 'A ticker can\'t be a number.';  // Ticker input was a number in /<ticker>
const noTicker = 'Ticker not found.'  // Ticker not found in /<ticker>

bot.on('/start', (msg) => {
  msg.reply.text('/info <name> for information on the coin with that name\n'
    + '/info <rank> for information on the coin with that rank\n'
    + '/global for total market information\n'
    + '/<ticker> for latest Binance ticker price');
});

// Ticker information from CoinMarketCap
bot.on(/^\/info (.+)$/i, (msg, props) => {
  if (calls > 10) {
    return msg.reply.text(tooMuch, {asReply: true});
  }
  calls++;
  var text = props.match[1].substring(5);
  // Checks if the same argument has been passed into the command in the last 5 minutes
  if (text in cache && Math.floor((new Date() - 
      new Date(parseInt(cache[text]['last_updated']) * 1000)) / 
      60000 % 60) < 5) {
    return msg.reply.text(formatInfo(cache[text]), {asReply: true});
  } else {
    if (isNaN(text)) {
      // Bot replies with information on the currency if found
      fetch(baseUrl + 'ticker/' + text.toLowerCase() + '/').then((res) => {
        return res.json();
      }).then((info) => {
        // If currency found, info is a JS object wrapped in an array
        // If not found, info is just a JS object
        console.log(info);
        // Info[0] is a JS object if currency found, otherwise it is undefined
        if (info[0]) {
          cache[text] = info[0];
          return msg.reply.text(formatInfo(info[0]), {asReply: true});
        } else {
          return msg.reply.text(noCurrency, {asReply: true});
        }
      });
    } else {
      fetch(baseUrl + 'ticker/?limit=' + text).then((res) => {
        return res.json();
      }).then((info) => {
        // Info is an array of JS objects
        console.log(info);
        cache['global'] = info[parseInt(text) - 1]; 
        return msg.reply.text(formatInfo(info[parseInt(text) - 1]), 
          {asReply: true});
      });
    }
  }
});

// Total market information from CoinMarketCap
bot.on('/global', (msg) => {
  // Current time
  var d = new Date();
  if (calls > 10) {
    return msg.reply.text(tooMuch, {asReply: true});
  }
  calls++;
  // Checks if global command has been called in last 5 minutes
  if ('global' in cache && Math.floor((new Date() - 
      new Date(parseInt(cache['global']['last_updated']) * 1000)) / 
      60000 % 60) < 5) {
    return msg.reply.text(formatGlobalInfo(cache['global']), {asReply: true});
  }
  fetch(baseUrl + '/global/').then((res) => {
    return res.json();
  }).then((info) => {
    // Info is a JS object
    console.log(info);
    cache['global'] = info;
    return msg.reply.text(formatGlobalInfo(info), {asReply: true});
  });
});

// Latest exchange price from Binance
bot.on(/^\/(.+)$/i, (msg, props) => {
  var text = props.match[1].toLowerCase();
  console.log(text);
  // Accounts for not responding to one of the other commands
  if (!text.startsWith('global')
      && !text.startsWith('info')
      && /^[a-zA-Z]+$/.test(text)
      && text.length < 5) {
    if (calls > 10) {
      return msg.reply.text(tooMuch, {asReply: true});
    }
    calls++;
    // Checks if command has been called in the past 5 minutes
    if (bin[0] !== undefined && Math.floor((new Date() - bin[1]) / 60000 % 60) < 5) {
      return msg.reply.text(formatBinanceInfo(bin[0], text.toUpperCase()), 
        {asReply: true});
    } else {
      if (isNaN(text)) {
        binance.prices((ticker) => {
          bin[1] = new Date();
          bin[0] = ticker;
          console.log('Called Binance API');
          return msg.reply.text(formatBinanceInfo(ticker, text.toUpperCase()), 
            {asReply: true});      
        });
      } else {
        return msg.reply.text(notNumber, {asReply: true});
      }
    }
  } 
});

bot.start();

// Formats the output of the json for better readability
function formatInfo(info) {
  var output = info['name'] + ' (' + info['symbol'] + ')\n';
  output += ('CoinMarketCap ID: ' + info['id'] + '\n')
  output += ('CoinMarketCap Rank: ' + info['rank'] + '\n');
  output += ('https://coinmarketcap.com/currencies/' + info['id'] + '/\n\n');

  output += ('Price USD: $' + formatNum(info['price_usd']) + '\n');
  output += ('Price BTC: ' + info['price_btc'] + ' BTC\n\n');

  output += ('Market Cap: $' + formatNum(info['market_cap_usd']) + '\n');
  output += ('24h Volume: $' + formatNum(info['24h_volume_usd']) + '\n');
  output += ('Available Supply: ' + formatNum(info['available_supply']) + '\n');
  output += ('Total Supply: ' + formatNum(info['total_supply'])+ '\n');
  if (info['max_supply']) {
    output += ('Maximum Supply: ' + formatNum(info['max_supply']) + '\n');
  }

  output += ('\nChange 1h: ' + formatNum(info['percent_change_1h']) + '%\n');
  output += ('Change 24h: ' + formatNum(info['percent_change_24h']) + '%\n');
  output += ('Change 7d: ' + formatNum(info['percent_change_7d']) + '%\n\n');

  return output + 'Last Updated: '
    + new Date(parseInt(info['last_updated']) * 1000).toString();
}

// Formats the output of the json for global CMC data
function formatGlobalInfo(info) {
  var output = 'Total Market Cap: $'
    + parseInt(info['total_market_cap_usd']).toLocaleString() + '\n';
  output += ('Total 24h Volume: $'
    + parseInt(info['total_24h_volume_usd']).toLocaleString() + '\n');
  output += ('Bitcoin Percentage of Market Cap: '
    + info['bitcoin_percentage_of_market_cap'] + '%\n\n');

  output += ('Number of Active Currencies: ' + info['active_currencies'] + '\n');
  output += ('Number of Active Assets: ' + info['active_assets'] + '\n');
  output += ('Number of Active Markets: ' + info['active_markets'] + '\n\n');

  output += ('https://coinmarketcap.com/charts/' + '\n\n');

  return output + 'Last Updated: '
    + new Date(parseInt(info['last_updated']) * 1000).toString();
}

// Formats the output for Binance exchange price
function formatBinanceInfo(ticker, text) {
  // The keys in the ticker object are exchanges in format equivalent to VENETH
  var tradingPairs = ['ETH', 'BTC', 'BNB'];
  var output = '';
  tradingPairs.forEach((item) => {
    var exc = text + item;
    // Checks if there exists an exchange in the ticker with each of the pairs
    if (ticker[exc]) {
      output += (ticker[exc] + ' ' + exc.replace(text, text + '/') + ' ');
      output += ('($' + formatBin(ticker[exc], ticker[item + 'USDT']) + ')\n');
    }
  });
  if (ticker[text + 'USDT']) {
    output += (formatNum(ticker[text + 'USDT']) + ' ' + text + '/USDT\n');
  }
  return ((output == '') ? noTicker : output);
}

// Formats number string
function formatNum(str) {
  return parseFloat(str).toLocaleString();
}

// Formats the displayed estimated dollar price for Binance exchange values
function formatBin(price1, price2) {
  return (parseFloat(price1) * parseFloat(price2)).toLocaleString();
}

// Resets number of calls to 0 every minute
resetNumCalls();
setInterval(resetNumCalls, 60000);
function resetNumCalls() {
  console.log('Resetting number of calls at ' + new Date().toString());
  calls = 0;
}

// Resets the caches every 2 hours
resetCaches();
setInterval(resetCaches, 7200000);
function resetCaches() {
  console.log('Resetting caches at ' + new Date().toString());
  cache = {};
  bin = [];
}