var express = require('express')
var app = express();

var PORT = 8080;
var bodyParser = require('body-parser');

var stats = {};
var etherScanToken = "JGSQ6DWADX27BD2FQ7ZT6NTP2TVDCI7CZS";

app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());


app.get('/', function(req, response) {

    response.render('index.html', {"stats": stats } );
});


function getEtherLastPrice() {
	var json = http.get('https://api.etherscan.io/api?module=stats&action=ethprice&apikey=' + etherScanToken);
	console.log('result:' + json);
}

// Server App listening 
app.listen(PORT);