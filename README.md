# crypto-bot

Telegram bot that uses the CoinMarketCap API and the Binance API to get information on cryptocurrencies and the global cryptocurrency market.

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
4. Make a file called `config.json` in the repo directory.
5. Copy/paste the below into the file.
    ```javascript
    {
        "telegramToken" : "Telegram token here",
        "binanceKey": "Binance API key here",
        "binanceSecret": "Binance API secret here"
    }
    ```
6. Put your Telegram token and Binance API key and secret where it says to in the config.
7. Run the bot.
    ```console
    node bot.js
    ```

## Commands
| Command | Description | Usage | Example |
| --- | --- | --- | --- |
| /info | Get info on coin with that name | /info `<coin>` | `/info Bitcoin` |
| /info | Get info on coin with that CoinMarketCap rank | /info `<number>` | `/info 11` |
| /global | Get total market information | /global | `/global` |
| / | Get latest Binance ticker price for a coin | /`<ticker>` | `/ETH` |
