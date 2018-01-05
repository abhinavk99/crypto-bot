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
			// Obj is a JS object if currency found, otherwise it is undefined
			var obj = info[0];
			if (info[0]) {
				var output = '';
				for (var key in obj) {
					output += (key.replace(/_/g, ' ') + ': ' + obj[key] + '\n');
				}
				return msg.reply.text(output, {asReply: true});
			}
			return msg.reply.text('No currency found with that name.', {asReply: true});
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
				var sym = obj['symbol'];
				output += (obj['name'] + ', ' + sym + ', ' + obj['price_usd'] + ' ' + sym + '/USD\n');
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
		var output = '';
		for (var key in info) {
			output += (key.replace(/_/g, ' ') + ': ' + info[key] + '\n');
		}
		return msg.reply.text(output, {asReply: true});
	}).catch((err) => {
		console.log(err);
	});
});

bot.start();