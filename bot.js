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
		// Bot replies with information on the currency if found
		cmc.getTicker({limit: 1,  currency: text.toLowerCase()})
		.then((info) => {
			// If currency found, info is a JS object wrapped in an array
			// If not found, info is just a JS object
			console.log(info);
			// Info[0] is a JS object if currency found, otherwise it is undefined
			if (info[0]) {
				return msg.reply.text(formatInfo(info[0]), {asReply: true});
			} else {
				return msg.reply.text('No currency found with that name.', {asReply: true});
			}
		}).catch((err) => {
			console.log(err);
		});
	} else {
		cmc.getTicker({limit: parseInt(text)})
		.then((info) => {
			// Info is an array of JS objects
			console.log(info);
			var output = '';
			info.forEach((obj) => {
				var price = parseFloat(obj['price_usd']).toLocaleString();
				output += (obj['name'] + ' (' + obj['symbol'] + '), Price USD: $' + price + '\n');
			});
			return msg.reply.text(output, {asReply: true})
		}).catch((err) => {
			console.log(err);
		});
	}
	
});

// Total market information
bot.on('/global', (msg) => {
	cmc.getGlobal()
	.then((info) => {
		// Info is a JS object
		console.log(info);
		return msg.reply.text(formatInfo(info), {asReply: true});
		// return msg.reply.text(output, {asReply: true});
	}).catch((err) => {
		console.log(err);
	});
});

bot.start();

// Formats the output of the json for better readability
function formatInfo(info) {
	var output = info['name'] + ' (' + info['symbol'] + ')\n';
	output += ('CoinMarketCap ID: ' + info['id'] + '\n')
	output += ('CoinMarketCap Rank: ' + info['rank'] + '\n\n');

	output += ('Price USD: $' + parseFloat(info['price_usd']).toLocaleString() + '\n');
	output += ('Price BTC: ' + info['price_btc'] + ' BTC\n\n');

	output += ('Market Cap: $' + parseFloat(info['market_cap_usd']).toLocaleString() + '\n');
	output += ('24h Volume: $' + parseFloat(info['24h_volume_usd']).toLocaleString() + '\n');
	output += ('Available Supply: ' + parseFloat(info['available_supply']).toLocaleString() + '\n');
	output += ('Total Supply: ' + parseFloat(info['total_supply']).toLocaleString() + '\n');
	if (info['max_supply']) {
		output += ('Maximum Supply: ' + parseFloat(info['max_supply']).toLocaleString() + '\n');
	}

	output += ('\nChange 1h: ' + parseFloat(info['percent_change_1h']).toLocaleString() + '%\n');
	output += ('Change 24h: ' + parseFloat(info['percent_change_24h']).toLocaleString() + '%\n');
	output += ('Change 7d: ' + parseFloat(info['percent_change_7d']).toLocaleString() + '%\n\n');

	return output + 'Last Updated: ' + new Date(parseInt(info['last_updated']) * 1000).toString();
}