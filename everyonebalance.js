
var btc = 0;
var fs = require('fs')
const ccxt = require('ccxt')
var keys = {//
"anakyl": {"apiKey": "gwjeMEU_",
  "secret": "i6kSigVPTH_TOKBSbkdGYpn7zeiAWK9K6UWj2C8Rui4"},
0: {"apiKey": "uEGj-wsZ",
  "secret": "hkoh80n2hRafjdWWAP926Z8A3oo4n6CbEmoYEqDPvRc"},
"NodeDroid": {"apiKey": "SjRsz1oU",
  "secret": "hkrbC_Hlk8vNN2AoDyQVJMmtob5ikvCFoNUdFU0CthU"}
}
 var clients = {}
 for (var key in keys){
    clients[key]=(new ccxt.deribit(keys[key]))
 }
 nope = {}
 for (var key in keys){
nope[key] = true
 }
 ////console.log(clients.length)
var lines = {}
var PortfolioAnalytics = require ('portfolio-analytics')
var avg = 0
var high = 0
var btcbtc  = {}

//client.urls['api'] = client.urls['test']


//client.urls['api'] = client.urls['test']
var btcstart = {}
const testFolder = './';

fs.readdir(testFolder, (err, files) => {
  files.forEach(file => {
    if (file.includes('balance-')){
    var f=(file.split('-')[1].split('.')[0])
if (f != undefined){
    ////console.log(f)
fs.readFile(file, 'utf8', function(err, contents) {
  start = contents.split('\n')[contents.split('\n').length-2]
  ////console.log(start)
  btcs2 = start.split(',')[0]
  user2 = start.split(',')[1]
  ////console.log(btcs2)
  ////console.log(user2)
  nope[user2] = false
  ////console.log(user2)
  btcstart[user2] = btcs2
  console.log(nope)
  })
}
}
  });
});

var usdstart = {}
var btcs = {}
var ids = []
var btc2 = {}
var vol = {}
var line = {}
var tradesArr = []
var first = true;
var m;
var fee = 0
var usd 
var usds = {}
var trades ={}
var btcusds = {}
var btcusd;
var btcusdv
var btcusdvstart
setTimeout(function(){
    doCall();

}, 6000)
async function doCall(){
	ethusd = await clients[0].fetchTicker('ETH-PERPETUAL')
	ethusd = ethusd['last']
	btcusdv = await clients[0].fetchTicker('BTC-PERPETUAL')
btcusdv = btcusdv['last']
if (first){
	btcusdvstart = btcusdv
}
btcusd = -1 * (1-(btcusdv / btcusdvstart)) * 100
ethbtc = btcusd/ethusd

	if (first){
		m = await clients[0].fetchMarkets()
	}
	for (var market in m){
		if (m[market].type == 'future'){
           
	}
	}
	
	//////console.log(trades.length)

//account         = await client.fetchBalance({'currency':'ETH'})
//////console.log(account)

//btc = parseFloat(account [ 'total' ] ['ETH']) / ethbtc
//////console.log(btc)
for (var user in keys){
account         = await clients[user].fetchBalance()
//////console.log(account)

btc = parseFloat(account [ 'total' ] ['BTC'])

btc2[user] = btc
////console.log(btc2[user])
console.log(nope)
console.log(btcstart[user])
if (first && (nope[user] || btcstart[user] == 'undefined'))
{
    console.log('btcstart')
btcstart[user] =  btc2[user]//(btc * ethbtc - 0.0029) / ethbtc
usdstart[user] = btcstart[user] * btcusdv
first = false;
}
if (btcbtc[user] == undefined){
    btcbtc[user] = []
  }
  if (btcusds[user] == undefined){
    btcusds[user] = []
  }
  if (btcs[user] == undefined){
    btcs[user] = []
  }
  if (usds[user] == undefined){
    usds[user] = []
  }
  

    btcs[user] = []
    usds[user] = []
    btcusds[user] = []
}
////console.log(user)
try{
btcbtc[user].push( [new Date().getTime(), btc2[user]])
btcs[user].push( [new Date().getTime(), -1 * (1-(btc2[user] / btcstart[user])) * 100])
usd = btc2[user] * btcusdv
usds[user].push( [new Date().getTime(), -1 * (1-(usd / usdstart[user])) * 100])
btcusds[user].push( [new Date().getTime(), btcusd])
}
catch(err){
    ////console.log(err)
}
//////console.log(btc)
doCall()
}

setInterval(function(){
for (var user in keys){
dowrite(user)
}}, 60 * 60 * 1000)
var towrite = {}
function dowrite(user){
        //console.log(user)
try{
fs.readFile("balance-" + user + ".csv", 'utf8', function(err, contents) {
//console.log(err)
console.log(user)
    //console.log(contents);
    towrite[user]=""
    towrite[user]+=contents

towrite[user]+=btcstart[user] +","+user + "," + high+","
+avg+","

+usds[user][0]+","
+usds[user][usds[user].length-1]+","
+btcusds[user][btcusds[user].length-1]+","

+ btcs[user][0]+","
+-1 * (1-(btc2[user] / btcstart[user])) * 100+","
+vol[user]+","
+fee * btcusd+"\n"

fs.writeFileSync("balance-" + user + ".csv", towrite[user])


})
}
catch(err){
    //console.log(err)
       towrite[user] = ""

        towrite[user]="btcstart,user,high,avg,usdinitial,usd,btcusd,btcinitial,btc,qty,fee\n"


    towrite[user]+=btcstart[user] +"," +user + "," + high+","
+avg+","
+usds[user][0]+","
+usds[user][usds[user].length-1]+","
+btcusds[user][btcusds[user].length-1]+","

+ btcs[user][0]+","
+-1 * (1-(btc2[user] / btcstart[user])) * 100+","
+vol[user]+","
+fee * btcusd+"\n"
        fs.writeFileSync("balance-" + user + ".csv",
towrite[user])

}

}
setTimeout(function(){

    for (var user in keys){
dowrite(user)
}
}, 40000);
setTimeout(function(){
for (var user in keys){
dowrite(user)
}}, 44000);
setTimeout(function(){
for (var user in keys){
dowrite(user)
}}, 48000);