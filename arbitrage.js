const rp = require('request-promise');
const cheerio = require('cheerio');
var CoinMarketCap = require("node-coinmarketcap");
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


let removeLeadingDollarSign = (string) => {
  return string.substr(1, string.length - 1);
};

let removeComma = (string) => {
  return string.replace(/,\s?/g, "");
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

      if (volume >= MIN_VOLUME_THRESHOLD) {
        opportunities.push({
          source,
          pair,
          volume,
          price
        });
      }
    });
    opportunities.sort((a, b) => {
      return b.price - a.price;
    });

    let highestPrice = opportunities[0];
    let lowestPrice = opportunities[opportunities.length - 1];

    if (((parseFloat(highestPrice.price) / parseFloat(lowestPrice.price)) - 1) >= MIN_ARBITRAGE_THRESHOLD) {
      console.log('arbitrage opportunity exists for: ', coin );
      console.log(`buy from source: ${lowestPrice.source}, pair: ${lowestPrice.pair}, volume: ${lowestPrice.volume}, price: ${lowestPrice.price}`);
      console.log(`sell from source: ${highestPrice.source}, pair: ${highestPrice.pair}, volume: ${highestPrice.volume}, price: ${highestPrice.price}`)
      console.log('\n');
    }
  }).catch(function (err) {
    console.log('err', err);
  });
};
