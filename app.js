var express = require('express')
var https = require('https'); 
var app = express();
var engines = require('consolidate');
var config = require('config');
var cors = require('cors');
var Coinmarketcap = require('node-coinmarketcap-api');
var coinmarketcap = new Coinmarketcap();
var expressLogging = require('express-logging');
var logger = require('logops');

var PORT = config.get('ethos.config.port');


var bodyParser = require('body-parser');

// Token from etherscan.io for getting data using APIs
var etherScanToken = "JGSQ6DWADX27BD2FQ7ZT6NTP2TVDCI7CZS";

// Database
var db = require('any-db');
var db_url = 'sqlite3://chaindata.db';
var pool = db.createConnection(db_url);
var globalSearchTxns;
var globalSearchBlocks;
var globalSearchTokens;


// CORS
var whitelist = [
    'http://0.0.0.0:' + PORT,
    'https://api.coinmarketcap.com/v1/ticker/'
];

var corsOptions = {
    origin: function(origin, callback){
        var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
        callback(null, originIsWhitelisted);
    },
    credentials: true
};
app.use(cors(corsOptions));
app.use(expressLogging(logger));

logger.info('PORT USED is: %d', PORT);

// CSV parser
var csv =  require('csv');
var csv_obj = csv();

// copied from asignment page on website
app.engine('html', engines.hogan); // tell Express to run .html files through Hogan
app.set('views', './templates'); // tell Express where to find templates, in this case the '/templates' directory
app.set('view engine', 'html'); //register .html extension as template engine so we can render .html pages 

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(express.static('public'));

// For minutes and seconds, add an extra 0, if value is < 10, for proper format
function getTwoDigits(val) {
  if(parseInt(val) < 10) {
    return '0' + val;
  }
  return val;
}

// Referenced from below site.
// https://stackoverflow.com/questions/847185/convert-a-unix-timestamp-to-time-in-javascript
function getReadableTime(epoch) {
    var a = new Date(epoch*1000);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];  
    var date = a.getDate() + '/' +months[a.getMonth()] +'/'+a.getFullYear();
    var time = a.getHours() + ":" + getTwoDigits(a.getMinutes()) + ":" + getTwoDigits(a.getSeconds());
    var timestamp = date + '  ' + time;
    return timestamp;
}


function formatEtherStats(msgs) {
  var formatted = [];
 
   msgs = Object.values(msgs);
   
    var tmp = {
      "ethbtc": msgs[0],
      "ethbtc_timestamp" : getReadableTime(msgs[1]),
      "ethusd" : msgs[2],
      "ethusd_timestamp": getReadableTime(msgs[3])
  	};
    formatted.push(tmp);
  
  return formatted;
}


function getHomePageStats(response) {
  var url = 'https://api.etherscan.io/api?module=stats&action=ethprice&apikey=' + etherScanToken;
  https.get(url, res => {
		  res.setEncoding("utf8");
		  var msgs = "";
		  res.on("data", data => {
		    msgs += data;
		  });
	  res.on("end", () => {
	    msgs = JSON.parse(msgs);

	    msgs = formatEtherStats(msgs.result);

                var url = 'https://www.etherchain.org/api/basic_stats';
                  https.get(url, res => {
                      //res.setEncoding("utf8");
                      var m = "";
                      res.on("data", data => {
                        m += data;
                      });
                    res.on("end", () => {
                      m = JSON.parse(m);
                      m = m.currentStats;

                     // m = formatEtherStats(msgs.result);
                      logger.info('Rendering index.html');

                     response.render('index.html', 
                          {"ethbtc": msgs[0].ethbtc,
                            "ethbtc_timestamp": msgs[0].ethbtc_timestamp,
                            "ethusd" : msgs[0].ethusd,
                      "ethusd_timestamp": msgs[0].ethusd_timestamp,
                        "hashrate": m.hashrate,
                        "difficulty": m.difficulty,
                        "blocktime": m.block_time.toFixed(9),
                        "unclerate": m.uncle_rate.toFixed(9) } );

                                    
                      });

                  });     
  		});

	});
}


app.get('/', function(req, response) {
	getHomePageStats(response);

});

app.post('/enter', function(req, response) {
    logger.info("App post enter");
    getHomePageStats(response);
});



function searchByBlock(searchText, response) {
  var url = 'https://api.blockcypher.com/v1/eth/main/blocks/' + searchText;
  logger.info("url is:" + url);
  https.get(url, res => {
      res.setEncoding("utf8");
      var msgs = "";
      res.on("data", data => {
       logger.info('====RESULTS ON searchByBlock=====');
        msgs += data;
      });
    res.on("end", () => {
      logger.info('=====BLOCK DATA searchByBlock=====');

      var searchResults = JSON.parse(msgs);

      logger.info("=====BLOCK DATA searchByBlock=====");
      globalSearchBlocks = searchResults;
       response.render('search-blocks.html', { "searchResults": searchResults });

      
      }); 
   });
}

function searchByTxHash(searchText, response) {
  var len = searchText.length;
  var txn = searchText.slice(2,len);
   var url = 'https://api.blockcypher.com/v1/eth/main/txs/' + txn;
  logger.info("url is:" + url);

  https.get(url, res => {
      res.setEncoding("utf8");
      var msgs = "";
      res.on("data", data => {
        logger.info("====RESULTS ON searchByTxHash=====");
        logger.info(data);
        msgs += data;
      });
    res.on("end", () => {
      logger.info("=====TXN DATA searchByTxHash=====");
      var searchResults = JSON.parse(msgs);

      logger.info("=====TXN DATA searchByTxHash=====");
      globalSearchTxns = searchResults;
       response.render('search-transactions.html', { "searchResults": searchResults });
      
      }); 
   });
}


function searchByToken(searchText, response) {
   logger.info("FUNC searchByToken called");

  ( async () => {
   let results = await coinmarketcap.ticker(searchText, 'EUR');
    logger.info(results);
      globalSearchTokens = results;
       response.render('search-tokens.html', { "searchResults": results });
  })();

}


function handleError(response) {
  response.status(404);
  response.json("Error or No such information..!");
}

app.get('/search/:searchText/:searchWhat', handleSearch);
app.post('/search/:searchText/:searchWhat', handleSearch);
function handleSearch(request, response) {
  var searchText = request.params.searchText;
  logger.info("Server received Search request: "+searchText);
  var searchWhat = request.params.searchWhat;
  logger.info("Server searchWhat: "+searchWhat);
  if(searchWhat == "Block") {
    searchByBlock(searchText, response);
  }else if(searchWhat == "TxHash") {
    searchByTxHash(searchText, response);
  }else if(searchWhat == "Token"){
    searchByToken(searchText, response);
  }else {
    // This is not possible to happen
    logger.info("error");
  }
}


function getEtherLastPrice() {
	var json = http.get('https://api.etherscan.io/api?module=stats&action=ethprice&apikey=' + etherScanToken);
	logger.info('result:' + json);
}



function createTables() {
  pool.query('DROP TABLE transactions', function(err, res){
    logger.info("Unable to drop table transactions");
  })

  pool.query('CREATE TABLE IF NOT EXISTS transactions(TxHash TEXT PRIMARY KEY, BlockNo TEXT, UnixTimestamp TEXT, TxDate TEXT, FromBlock TEXT, ToBlock TEXT, Quantity TEXT)', function(error, data){
      if(error) {
        logger.info("Error:" +error);
      }
  })

  pool.query('CREATE TABLE IF NOT EXISTS etherprice(ID INTEGER PRIMARY KEY AUTOINCREMENT, Date TEXT, UnixTimeStamp TEXT, Value REAL)', function(error, data){
      if(error) {
        logger.info("Error:" +error);
      }
  })

      pool.query('CREATE TABLE IF NOT EXISTS blocks(TxHash TEXT PRIMARY KEY, blockNumber TEXT, timeStamp TEXT, blockMiner TEXT, blockReward TEXT)', function(error, data){
      if(error) {
        logger.info("Error:" + error);
      }
  })
}

function formattedTxns(txns) {
  var formattedTxns = [];
  for(var i=0; i< txns.length;i++) {
    var tmp = {
       "TxHash": txns[0],
          "BlockNo": txns[1],
          "UnixTimestamp": txns[2],
          "txDate": txns[3],
          "FromBlock": txns[4],
          "To": txns[5],
          "Quantity": txns[6]
    }

    formattedTxns.push(tmp);
  }

  return formattedTxns;
}


app.get('/transactions', getTxns);
function getTxns(request, response) {
  var sql = 'SELECT TxHash, BlockNo , txDate , FromBlock , ToBlock , Quantity FROM transactions';

  pool.query(sql, function(error, result){
      if(error) {
        logger.info("Error: " +error);
      }else {
        var txns = result.rows;
        logger.info("Rendering transactions.html");
        logger.info(txns);
        response.render('transactions.html', { "txns": txns });
      }
  })

}

app.get('/tokens', getTokens);
function getTokens(request, response) {
  response.render('tokens.html');
}


app.get('/search-blocks', getSearchResultBlocks);
function getSearchResultBlocks(request, response) {
  response.render('search-blocks.html',{ "searchResults": globalSearchBlocks });
}


app.get('/search-transactions', getSearchResultTransactions);
function getSearchResultTransactions(request, response) {
  response.render('search-transactions.html',{ "searchResults": globalSearchTxns });
}

app.get('/search-tokens', getSearchResultTokens);
function getSearchResultTokens(request, response) {
  response.render('search-tokens.html',{ "searchResults": globalSearchTokens });
}


app.get('/contracts', getContracts);
function getContracts(request, response) {
  response.render('contracts.html');
}


// function insertDB(TxHash, BlockNo , UnixTimestamp , txDate , From , To , Quantity ){

//    pool.query('INSERT INTO transactions(TxHash, BlockNo , UnixTimestamp , TxDate , FromBlock , ToBlock , Quantity) VALUES($1, $2, $3, $4, $5, $6, $7)', [TxHash, BlockNo , UnixTimestamp , txDate , FromBlock , ToBlock , Quantity],  function(error, data){
//       if(error) {
//         logger.info(error);
//       }
//   })

// }


function readTxnsDataAndInsertInDB() {
 // var data1 = [];

  var txFile = "./txns.csv";
  csv_obj.from.path(txFile).to.array(function (data) {
    for (var i = 1; i < data.length; i++) {
      //logger.info(data[i][0])

pool.query('INSERT INTO transactions(TxHash, BlockNo , UnixTimestamp , TxDate , FromBlock , ToBlock , Quantity) VALUES($1, $2, $3, $4, $5, $6, $7)',
      [data[i][0],data[i][1],data[i][2],data[i][3],data[i][4],data[i][5],data[i][6]],  function(error, data){
      if(error) {
        logger.info(error);
      }
  })
     
    }
 });
}


app.get('/blocks', getBlocks);
function getBlocks(request, response) {
  pool.query('SELECT * from blocks', function(error, result){
      if(error) {
        logger.info("Error: " + error);
      }else {

        var blocks = result.rows;
        logger.info("Rendering blocks.html");
        //logger.info(blocks);
        response.render('blocks.html', {"blocks": blocks});
      }
  })

}

function formatStats(msgs) {
  var formatted = [];
 
   msgs = Object.values(msgs[0]);
   
    var tmp = {
      "ethbtc": msgs[0],
      "ethbtc_timestamp" : msgs[1],
      "ethusd" : msgs[2],
      "ethusd_timestamp": msgs[3]
    };
    formatted.push(tmp);
  
  return formatted;
}

function formatMkt(msgs) {
  var formatted = [];

  for(var i=0; i < msgs.length; i++) {
    m = Object.values(msgs[i])
    //console.log("formatMkt:" + Object.values(msgs[i]));

    var tmp = {
      "ethusd" : m[0],
      "ethusd_timestamp": m[1]
    };
    formatted.push(tmp);
  }
  
 // console.log(formatted);

  return formatted;
}


app.get('/markets', getMarkets);
function getMarkets(request, response) {

 var sql = 'SELECT Date,Value FROM etherprice';

  pool.query(sql, function(error, result){
      if(error) {
        logger.info("Error: " +error);
      }else {
        var msgs = result.rows;
        msgs = formatMkt(msgs);

        logger.info("Rendering markets.html");
        //logger.info(msgs);
        //response.cookie('mkt', JSON.stringify(msgs))
        response.render('markets.html', { "msgs": msgs });
      }
  })



  // var url = 'https://api.etherscan.io/api?module=stats&action=ethprice&apikey=' + etherScanToken;
  // https.get(url, res => {
  //     res.setEncoding("utf8");
  //     var msgs = "";
  //     res.on("data", data => {
  //       msgs += data;
  //     });
  //   res.on("end", () => {
  //     msgs = JSON.parse(msgs);
  //      console.log('Markets1:');
  //          console.log(msgs);
  //     msgs = formatStats(msgs.result);
  //     console.log('Markets:');
  //          console.log(msgs);
  //               response.render('markets.html', {"msgs": msgs});
  //     });

  // });
    
}


function readBlocksDataAndInsertInDB() {
  //var initial = 2165403;
  var initial = 0;
  for (var i = 1; i < 5; i++){
    var tmp = initial+i;
    var url = 'https://api.etherscan.io/api?module=block&action=getblockreward&blockno=' + tmp + '&apikey=' + etherScanToken;
    logger.info("URL:" +url);
    https.get(url, res => {

      res.setEncoding("utf8");
      var msgs = "";
      res.on("data", data => {
        msgs += data;
      });
     res.on("end", () => {
        msgs = JSON.parse(msgs);
        //logger.info("RESULT HERE ");
        //logger.info(msgs.result);
        //msgs = formatEtherStats(msgs.result);
        //logger.info("Rendering blocks.html");
        if (msgs.result.message === "NOTOK"){
          logger.info("not ok");
        }
          pool.query('INSERT INTO blocks(blockNumber, timeStamp, blockMiner, blockReward) VALUES($1, $2, $3, $4)',
          [msgs.result.blockNumber,msgs.result.timeStamp,msgs.result.blockMiner, msgs.result.blockReward],  function(error, data){
              if(error) {
               logger.info(error);
              }
           })
        
      });
        });
}
}

function readEtherPriceAndInsertInDB() {

  var txFile = "./etherprice.csv";
  csv_obj.from.path(txFile).to.array(function (data) {
    for (var i = 1; i < data.length; i++) {
      //logger.info(data[i][0])

    pool.query('INSERT INTO etherprice(Date, UnixTimeStamp, Value) VALUES($2, $3, $4)',
          [data[i][0],data[i][1],data[i][2]],  function(error, data){
          if(error) {
            logger.info(error);
          }
      })
     
    }
 });
}

function closeDBConnection() {
  pool.end()
}


process.on('SIGINT', function () {
    console.log('Ctrl-C...');
    closeDBConnection();
    console.log("Closed DB connection properly on SIGINT.. :)")
    process.exit(1);
});


logger.info("Creating the Database and tables");
createTables();
logger.info("Created tables");




readBlocksDataAndInsertInDB();

logger.info("Inserting transactions data into database");
readTxnsDataAndInsertInDB();
logger.info("Inserted transactions data into database");

// Server App listening 
logger.info("Server listening on Port: " +PORT);
app.listen(PORT);










