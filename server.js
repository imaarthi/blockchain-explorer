var express = require('express')
var https = require('https'); 
var app = express();
var engines = require('consolidate');
var PORT = 8080;
var bodyParser = require('body-parser');
var stats = {};
var etherScanToken = "JGSQ6DWADX27BD2FQ7ZT6NTP2TVDCI7CZS";


// copied from asignment page on website
app.engine('html', engines.hogan); // tell Express to run .html files through Hogan
app.set('views', './'); // tell Express where to find templates, in this case the '/templates' directory
app.set('view engine', 'html'); //register .html extension as template engine so we can render .html pages 

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

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
	console.log('msgs:' + Object.keys(msgs));
	console.log('msgs:' + Object.values(msgs));
  var formatted;
 
 msgs = Object.values(msgs);

    var formatted = {
      "ethbtc": msgs[0],
      "ethbtc_timestamp" : getReadableTime(msgs[1]),
      "ethusd" : msgs[2],
      "ethusd_timestamp": getReadableTime(msgs[3])
  	};
    
   // formatted.push(tmp);
  
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
	    console.log(msgs);
	   // console.log(msgs.result);
	    msgs = formatEtherStats(msgs.result);
	   response.render('index.html', {"msgs": msgs } );
  		});
	  //response.render('index.html', {"msgs": msgs } );
	});
}

app.get('/', function(req, response) {
	getHomePageStats(response);
   // response.render('index.html', {"stats": stats } );
});


function getEtherLastPrice() {
	var json = http.get('https://api.etherscan.io/api?module=stats&action=ethprice&apikey=' + etherScanToken);
	console.log('result:' + json);
}

// Server App listening 
console.log("Server listening on Port: " +PORT);
app.listen(PORT);