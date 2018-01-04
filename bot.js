const TeleBot = require('telebot');
const Config = require('./config.json');
const CoinMarketCap = require('coinmarketcap-api');

const bot = new TeleBot(Config.token);
const cmc = new CoinMarketCap();

bot.on('/start', (msg) => msg.reply.text('/info <name> for information on a coin\n'
	+ '/info <number> for information on the top n coins\n'
	+ '/global for total market information'));

// Ticker information
bot.on(/^\/info (.+)$/, (msg, props) => {
	var text = props.match[1];
	if (isNaN(text)) {
		cmc.getTicker({limit: 1,  currency: text.toLowerCase()}).then(console.log).catch(console.error);
	} else {
		cmc.getTicker({limit: parseInt(text)}).then(console.log).catch(console.error);
	}
});

// Total market information
bot.on('/global', (msg) => {
	cmc.getGlobal().then(console.log).catch(console.error);
});

bot.start();