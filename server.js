var express = require('express')
var https = require('https'); 
var app = express();
var engines = require('consolidate');
var PORT = 8080;
var bodyParser = require('body-parser');

// Token from etherscan.io for getting data using APIs
var etherScanToken = "JGSQ6DWADX27BD2FQ7ZT6NTP2TVDCI7CZS";

// Database
var db = require('any-db');
var db_url = 'sqlite3://chaindata.db';
var pool = db.createConnection(db_url);

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
    console.log(epoch);
    var a = new Date(epoch*1000);
    console.log('a :' + a);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];  
    var date = a.getDate() + '/' +months[a.getMonth()] +'/'+a.getFullYear();
    var time = a.getHours() + ":" + getTwoDigits(a.getMinutes()) + ":" + getTwoDigits(a.getSeconds());
    var timestamp = date + '|' + time;
    console.log(timestamp);
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
  
    
  console.log("formatted:" + formatted);
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

	    console.log(msgs.result);
	    msgs = formatEtherStats(msgs.result);
      console.log("Rendering index.html");
	   response.render('index.html', {"msgs": msgs } );
  		});

	});
}

app.get('/', function(req, response) {
	getHomePageStats(response);

});

app.post('/enter', function(req, response) {
    console.log("App post enter");
    getHomePageStats(response);
});


function getEtherLastPrice() {
	var json = http.get('https://api.etherscan.io/api?module=stats&action=ethprice&apikey=' + etherScanToken);
	console.log('result:' + json);
}



function createTables() {
  pool.query('DROP TABLE transactions', function(err, res){
    console.log("Unable to drop table transactions");
  })

  pool.query('CREATE TABLE IF NOT EXISTS transactions(TxHash TEXT PRIMARY KEY, BlockNo TEXT, UnixTimestamp TEXT, TxDate TEXT, From TEXT, To TEXT, Quantity TEXT)', function(error, data){
      if(error) {
        console.log("Unable to createTables");
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
          "From": txns[4],
          "To": txns[5],
          "Quantity": txns[6]
    }

    formattedTxns.push(tmp);
  }

  return formattedTxns;
}


app.get('/transactions', getTxns);
function getTxns(request, response) {
  var sql = 'SELECT TxHash, BlockNo , txDate , From , To , Quantity FROM transactions';

  pool.query(sql, function(error, result){
      if(error) {
        console.log("");
      }else {
        var txns = result.rows;
        txns = formattedTxns(txns);
        console.log("Rendering transactions.html");
        response.render('transactions.html', { "txns": txns });
      }
  })

}


function insertDB(TxHash, BlockNo , UnixTimestamp , txDate , From , To , Quantity ){

   pool.query('INSERT INTO transactions(TxHash, BlockNo , UnixTimestamp , TxDate , From , To , Quantity) VALUES($1, $2, $3, $4, $5, $6, $7)', [TxHash, BlockNo , UnixTimestamp , txDate , From , To , Quantity],  function(error, data){
      if(error) {
        console.log(error);
      }
  })

}


function readTxnsDataAndInsertInDB() {
 // var data1 = [];

  var txFile = "./txns.csv";
  csv_obj.from.path(txFile).to.array(function (data) {
    for (var i = 0; i < data.length; i++) {
      //console.log(data[i][0])

          insertDB(data[i][0],data[i][1],data[i][2],data[i][3],data[i][4],data[i][5],data[i][6]);
        
          // "TxHash": data[index][0],
          // "BlockNo": data[index][1],
          // "UnixTimestamp": data[index][2],
          // "txDate": data[index][3],
          // "From": data[index][4],
          // "To": data[index][5],
          // "Quantity": data[index][6]
        

       
    }
    
   // console.log(data1);
    //return data1;
});



}



console.log("Creating the Database and tables");
createTables();
console.log("Created tables");

console.log("Inserting transactions data into database");
readTxnsDataAndInsertInDB();
console.log("Inserted transactions data into database");


// Server App listening 
console.log("Server listening on Port: " +PORT);
app.listen(PORT);










