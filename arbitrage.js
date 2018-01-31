const rp = require('request-promise');
const cheerio = require('cheerio');
var CoinMarketCap = require('node-coinmarketcap');
var coinmarketcap = new CoinMarketCap();

coinmarketcap.multi(coins => {
  const top100Coins = coins.getTop();

  top100Coins.forEach((element) => {
    findArtbirtageOpportunity(element.id);
  });
});

const getOptions = (coin) => {
  return {
    uri: `https://coinmarketcap.com/currencies/${coin}/#markets`,
    transform: (body) => {
      return cheerio.load(body);
    }
  };
};

const MIN_VOLUME_THRESHOLD = 100000;
const MIN_ARBITRAGE_THRESHOLD = 0.05;
const EXCHANGES = [ 'Liqui', 'Huobi', 'Cryptopia', 'HitBTC', 'Poloniex', 'Binance', 'KuCoin'];
const SWAP_CURRENCY = ['ETH', 'BTC'];
const EXCLUDED_LIST = {
  coin1: [ 'source1,', 'source2' ],
  coin2: [ 'source3']
};

let removeLeadingDollarSign = (string) => {
  return string.substr(1, string.length - 1);
};

let removeComma = (string) => {
  return string.replace(/,\s?/g, '');
};

let findArtbirtageOpportunity = (coin) => {
  let opportunities = [];

  rp(getOptions(coin)).then(($) => {
    $('#markets-table tbody tr').each(function(i, elem) {
      let $this = $(this);
      let tags = $this.find('a');
      let source = $(tags.get(0)).text().trim();
      let pair = $(tags.get(1)).text().trim();
      let volume = removeComma(removeLeadingDollarSign($this.find('.volume').text().trim()));
      let price = removeComma(removeLeadingDollarSign($this.find('.price').text().trim()));
      let pairTwo = pair.split('/')[1];

      if (EXCLUDED_LIST[coin] && EXCLUDED_LIST[coin].includes(source)) {
        return;
      }

      if (volume >= MIN_VOLUME_THRESHOLD && SWAP_CURRENCY.includes(pairTwo) && EXCHANGES.includes(source)) {
        opportunities.push({
          source,
          pair,
          volume,
          price
        });
      }
    });

    if (opportunities.length <= 1) {
      return;
    }

    opportunities.sort((a, b) => {
      return b.price - a.price;
    });

    let highestPrice = opportunities[0];
    let lowestPrice = opportunities[opportunities.length - 1];

    let arbitrageDecimal = (parseFloat(highestPrice.price) / parseFloat(lowestPrice.price)) - 1;

    if (arbitrageDecimal >= MIN_ARBITRAGE_THRESHOLD) {
      console.log(`Arbitrage opportunity exists for ${coin} to make a ${(arbitrageDecimal*100).toFixed(2)}% gain!`);
      console.log(`Buy from source: ${lowestPrice.source}, pair: ${lowestPrice.pair}, volume: ${lowestPrice.volume}, price: ${lowestPrice.price}`);
      console.log(`Sell from source: ${highestPrice.source}, pair: ${highestPrice.pair}, volume: ${highestPrice.volume}, price: ${highestPrice.price}`)
      console.log('\n');
    }
  }).catch(function (err) {
    console.log('err', err);
  });
};
