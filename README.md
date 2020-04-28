# crypto-bot

Telegram bot that uses the CoinMarketCap API and the Binance API to get
information on cryptocurrencies and the global cryptocurrency market.

Talk to @coinmarketcap_info_bot on Telegram! <https://t.me/coinmarketcap_info_bot>

## Installation

1. Clone the repo to your computer and install the required dependencies.
   ```console
   git clone https://github.com/abhinavk99/crypto-bot.git
   cd crypto-bot
   npm install
   ```
2. Get Binance API key and secret from your Binance user settings.
3. Get a Telegram bot token from [@BotFather](https://t.me/BotFather).
4. Get a CoinMarketCap API key from [here](https://pro.coinmarketcap.com/pricing).
5. Make a file called `.env` in the repo directory.
6. Copy/paste the below into the file.
   ```
   TELEGRAM_TOKEN=Token here
   BINANCE_KEY=Key here
   BINANCE_SECRET=Secret here
   COINMARKETCAP_KEY=Key here
   ```
7. Put your Telegram token, Binance API key and secret, and CoinMarketCap API
   key where it says to in the config. Do not put quotes around the tokens.
8. Run the bot.
   ```console
   npm start
   ```

## Commands

| Command | Description                                           | Usage            | Example          |
| ------- | ----------------------------------------------------- | ---------------- | ---------------- |
| /info   | Get info on coin with that symbol                     | /info `<coin>`   | `/info BTC`      |
| /info   | Get info on coin with that CoinMarketCap rank         | /info `<number>` | `/info 11`       |
| /global | Get total market information                          | /global          | `/global`        |
| /       | Get latest Binance ticker price for a coin            | /`<ticker>`      | `/ETH`           |
| /chart  | (Deprecated) Get chart on historical price for a coin | /chart `<coin>`  | `/chart Bitcoin` |

## Releases

Releases start at v1.1.0 because I didn't know how to use git tags before then and manually changed the versions in package.json
