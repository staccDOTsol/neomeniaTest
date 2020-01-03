var lowRSI = 3.5
var highRSI = 99
var minCrossSell = 0.0025
var minCrossBuy = 0.0025
var useMFI = true
var rsiTF = '1m'
var strat = process.env.strat
var mfiTF = 1
var leverage
var trailingTp = 0.2
trailingTp = parseFloat(process.env.trailingTp)
var period = 54
var buyTps = []
var last
var llast
var sellTps = []
var kvalue = 5
var dvalue = 3
var doRequest = true
var debug = process.env.debug
if (debug == 'true'){
    debug = true
}
else {
    debug = false
}
var log = process.env.log
if (log == 'false'){
    log = false
}
else {
    log = true
}
        const axios = require('axios')

var request = require('request')
setInterval(async function(){
    try{
ticker = await client.fetchTicker('BTC/USDT')

llast = last
last = ticker.last
}
catch(err){

    ////console.log(err)
}

for (var tp in buyTps){
    ////console.log('last: ' + last)
    ////console.log('llast: ' + llast)
    if (llast < last&& last < parseFloat(buyTps[tp].entry)){
        diff = last / llast
        buyTps[tp].price = parseFloat(buyTps[tp].price) * diff
    ////console.log('last: ' + last)
    ////console.log('llast: ' + last)
    ////console.log('diff: ' + diff)
    ////console.log('buytpstpprice: ' + buyTps[tp].price)
    } else{
        if (buyTps[tp].price > last && buyTps[tp].entry < last ){
            ////console.log('exit buy tp, price: ' + last + ' and buyTp price: ' + buyTps[tp].price)
            var o = await client.createOrder('BTC/USDT', "Limit", 'sell', buyTps[tp].qty, buyTps[tp].price - 100)
sltps.push(parseFloat(o.id))
            buyTps.splice(buyTps[tp], 1)
        }
    }
}
for (var tp in sellTps){

    if (llast > last&& last > parseFloat(sellTps[tp].entry)){
        diff = last / llast
        sellTps[tp].price = sellTps[tp].price * diff
    } else{
        if (sellTps[tp].price < last  && last < sellTps[tp].entry){
            ////console.log('exit sell tp, price: ' + last + ' and sellTps price: ' + sellTps[tp].price)
            var o = await client.createOrder('BTC/USDT', "Limit", 'buy', sellTps[tp].qty, sellTps[tp].price + 100)
sltps.push(parseFloat(o.id))
            sellTps.splice(sellTps[tp], 1)
        }
    }
}

}, 5000)
async function getVars(){
if (doRequest){
request.get("https://patrickbot.dunncreativess.now.sh/vars", function (e, r, d){
    try {
        if (strat == 'a'){
                j = JSON.parse(d).a
        lowRSI = parseFloat(j.lowRSI)
        highRSI = parseFloat(j.highRSI)
        highRSI =  70
        lowRSI = 30
        minCrossSell = parseFloat(j.minCrossSell)
        minCrossBuy = parseFloat(j.minCrossBuy)
        minCrossBuy = 0.03
        minCrossSell = 0.02
        rsiTF = (j.RSItf) + 'm'
        period = parseFloat(j.RSIPeriod)
        ////console.log(rsiTF) 
    }
else{
                j = JSON.parse(d).b
        lowRSI = parseFloat(j.lowRSI)
        highRSI = parseFloat(j.highRSI)
        minCrossSell = parseFloat(j.minCrossSell)
        minCrossBuy = parseFloat(j.minCrossBuy)
        rsiTF = (j.RSItf) + 'm'
        period = parseFloat(j.RSIPeriod) 

}
}
    catch (err){
        ////console.log(err)
    }
})
}

}
getVars()
setInterval(async function(){
getVars()
}, 1000 * 60 * 60 * 4)
var delaybetweenorder = 0.85 //sec
var takeProfit = parseFloat(process.env.takeProfit) //%
var stopLoss = parseFloat(process.env.stopLoss) //%
var min_withdrawal_percent = parseFloat(process.env.min_withdrawal_percent) 
var key=process.env.key
var tgUser=process.env.tgUser
var secret=process.env.secret
var keygood = false;
request.get("https://docs.google.com/spreadsheets/d/1IIrLxqGeL1PI8S42MDEk_Rposg1h6Xwaeaj8-nGr54g/gviz/tq?tqx=out:json&sheet=Sheet1",async function(e, r, d) {
        if (d.includes(key.substring(key.length-6, key.length))) {
keygood = true;
//console.log('keygood')
            }
        })
var maxFreePerc = parseFloat(process.env.maxFreePerc)
var orderSizeMult = parseFloat(process.env.orderSizeMult)
const ccxt = require('ccxt')
var bitmex = new ccxt.bitmex()

var doWithdraw = process.env.doWithdraw
if (doWithdraw == 'true'){
    doWithdraw = true
}else {
    doWithdraw = false
}
var withdrawMin 
const binance = require('./node-binance-api')().options({
  APIKEY: key,
  APISECRET: secret,
  useServerTime: true // If you get timestamp errors, synchronize to server time at startup
});

var client
var client2
var testing = process.env.testing
if (testing == 'true'){
    testing = true;
}else {
    testing = false
}
console.log(testing)
if (testing){

client = new ccxt.binance(
            {    options: { defaultType: 'future' }, // ←- this was wrong, should be defaultType
"apiKey": process.env.key,
            "secret": process.env.secret,
    'enableRateLimit': true, 
    'urls': {
        'api': {
            'fapiPublic': 'https://testnet.binancefuture.com/fapi/v1', // ←------  fapi prefix here
            'fapiPrivate': 'https://testnet.binancefuture.com/fapi/v1', // ←------  fapi prefix here
        }
    } 
 })

client2 = new ccxt.binance(
            {    options: { defaultType: 'future' }, // ←- this was wrong, should be defaultType
"apiKey": process.env.key,
            "secret": process.env.secret,
    'enableRateLimit': true, 
    'urls': {
        'api': {
            'fapiPublic': 'https://testnet.binancefuture.com/fapi/v1', // ←------  fapi prefix here
            'fapiPrivate': 'https://testnet.binancefuture.com/fapi/v1', // ←------  fapi prefix here
        }
    } 
 }) 
} 
else {
    client = new ccxt.binance({
    "apiKey": process.env.key,
    "secret": process.env.secret,
    "options": {
        "defaultMarket": "futures"
    },
    'enableRateLimit': true,
    'urls': {
        'api': {
            'public': 'https://fapi.binance.com/fapi/v1',
            'private': 'https://fapi.binance.com/fapi/v1',
        },
    }
})
client2 = new ccxt.binance({
    "options": {
        "defaultMarket": "futures"
    },
    'enableRateLimit': true,
    'urls': {
        'api': {
            'public': 'https://fapi.binance.com/fapi/v1',
            'private': 'https://fapi.binance.com/fapi/v1',
        },
    }
}) 
 //client.urls['api'] = client.urls['test']
}
var account;
var LB;
var HA;
var bal_usd;
var usd_init;
var bal_btc;
cancelall()
async function cancelallbyorderstatus() {
    ords = await client.fetchOpenOrders('BTC/USDT')

    for (var order in ords) {
        oid = ords[order]['info']['orderId']
        side = ords[order]['side']
        for (var o in openorders) {
            if (parseFloat(oid) == parseFloat(openorders[o].id)) {
                //if (buysell == 1 && side == 'buy'){
                //  ////console.log('cancelling..')
                try {
                    await client.cancelOrder(oid, 'BTC/USDT')
                } catch (e) {
                    ////console.log(e)

                }
            }

        }
        //}
        /* else if (buysell = 0 && side == 'sell'){
            try{
                 await client.cancelOrder( oid , 'BTC/USDT' )
             }
             catch (e){
                 ////console.log(e)
             
             }
         }*/
    }
}
async function cancelall() {
    ords = await client.fetchOpenOrders('BTC/USDT')

    for (var order in ords) {
        if (true) {
            oid = ords[order]['id']
            side = ords[order]['side']
            //if (buysell == 1 && side == 'buy'){
            //  ////console.log('cancelleing2...')
            try {
                await client.cancelOrder(oid, 'BTC/USDT')
            } catch (e) {
                ////console.log(e)

            }
            //}
            /* else if (buysell = 0 && side == 'sell'){
                try{
                     await client.cancelOrder( oid , 'BTC/USDT' )
                 }
                 catch (e){
                     ////console.log(e)
                 
                 }
             }*/
        }
    }
}
var initial_bal;
first = true;
var freePerc;
var position = 0;
setInterval(async function() {
    if (first) {
        var trades = await client.fapiPrivateGetUserTrades({
            'symbol': 'BTCUSDT',
            'limit': 1000
        })
        for (var t in trades) {
            tradesArr.push(trades[t].id)
        }
        ohlcv = await client2.fetchOHLCV('BTC/USDT', timeframe = rsiTF, since = undefined, limit = 74, params = {})
        //////console.log(ohlcv)
        var c = 0;
        for (var b in ohlcv) {
            ohlcvs.push[ohlcv[b]]
            if (rsis[0] == undefined) {
                rsis[0] = []
            }
            rsis[0].push(ohlcv[b][4])
            if (rsis[0].length > 1000) {
                rsis[0].shift()
            }
        }
        theRSI = RSI.calculate({
            rsiPeriod: period,
            stochasticPeriod: period,
            kPeriod: kvalue,
            dPeriod: dvalue,
            values: rsis[0]
        });
}
    pos = await client.fapiPrivateGetPositionRisk()
    ticker = await client.fetchTicker('BTC/USDT')
    LB = ticker.last + 0.5
    //////console.log(await client.fetchTicker( 'BTC/USDT' ))
    HA = ticker.last - 0.5
    if (pos[0] != undefined) {
        position = parseFloat(pos[0]['positionAmt'])
        leverage = parseFloat(pos[0]['leverage'])
        unrealized = parseFloat(pos[0]['unRealizedProfit']) / (position * HA) * parseFloat(pos[0]['leverage']) * 100
        if (position < 0) {
            unrealized = unrealized * -1
        }
        if (unrealized > takeProfit) {
            if (position > 0) {
                await client.createOrder('BTC/USDT', "Limit", 'sell', position, LB - 100)
            } else {
                await client.createOrder('BTC/USDT', "Limit", 'buy', position * -1, HA + 100)

            }
            sellTps.shift()
            buyTps.shift()
        }
        if (unrealized < stopLoss) {
            ////console.log(unrealized)

            if (position > 0) {
                await client.createOrder('BTC/USDT', "Limit", 'sell', position, LB - 100)
            } else {
                await client.createOrder('BTC/USDT', "Limit", 'buy', position * -1, HA + 100)

            }
            sellTps.shift()
            buyTps.shift()
        }
    }
    //////console.log(position)
    account = await client.fetchBalance()
        maxwithdrawamt=parseFloat(account.info.assets[0].maxWithdrawAmount)
    free_btc = parseFloat(account['info']['totalInitialMargin']) / HA

    bal_btc = parseFloat(account['info']['totalMarginBalance']) / HA
    bal_usd = parseFloat(account['info']['totalMarginBalance'])

    freePerc = (maxwithdrawamt / bal_usd)
   // ////console.log(freePerc)
    if (first) {

        //await client.loadProducts () 
        first = false;
        usd_init = bal_usd //50;
        initial_bal = bal_btc;
        qtybtc = bal_btc * 50 / 50
        qty = Math.floor(HA * qtybtc / 10) / HA
        qty = qty * orderSizeMult
     ////console.log('qty: ' + qty)
    }

    if (count >= 4 * 6 * 1) {
        count = 0;

axios.post('https://patrickbot.dunncreativess.now.sh/user', { user: tgUser,
  bal: bal_usd,
  now: new Date().getTime(),
  bal_init: usd_init })
.then((res) => {
    if (log){
  ////console.log(`statusCode: ${res.statusCode}`)
}
  //////console.log(res)
})
.catch((error) => {
  console.error(error)
})
if (log){

        ////console.log(' ')
        ////console.log('-----')
        ////console.log(new Date())
        ////console.log('position: ' + position)
        ////console.log('usedPerc: ' + freePerc)
        if (debug){
        ////console.log('q1: ' + rsiover)
        ////console.log('q2: ' + rsibelow)
        ////console.log('q3')
        ////console.log(diff < -1 * minCrossSell)
        ////console.log('q4')
        ////console.log(diff > minCrossBuy && diff < 100000)
        ////console.log('q5: ' + selling)
        ////console.log('q6: ' + buying)
        ////console.log('v1: ' + theRSI[theRSI.length - 1].k)
        ////console.log('v2: ' + diff)
        ////console.log('v3: ' + minCrossSell)
        ////console.log('v4: ' + minCrossBuy)
        ////console.log('bal btc: ' + bal_btc)
        ////console.log('pnl btc: % ' + -1 * (1 - bal_btc / initial_bal) * 100)
        }
        ////console.log('bal usd: ' + bal_usd)
        ////console.log('pnl usd: % ' + -1 * (1 - bal_usd / usd_init) * 100)
        }
        pnlusd = -1 * (1 - bal_usd / usd_init) * 100
        if (doWithdraw){
        if (pnlusd > ((min_withdrawal_percent * 100) * 2)) {
            var new_usd_init = bal_usd * (1 - (min_withdrawal_percent));
            binance.mgTransferMarginToMain('USDT', (min_withdrawal_percent) * bal_usd, (error, response) => {
                if (error) {
                    ////console.log(error)
                } else {

                    usd_init = new_usd_init
                    initial_bal = usd_init / LB;
                }
            }); 
        }
        }
        cancelall()
    }
    count++;
}, 2500)
var count = 0;
const RSI2 = require('technicalindicators').RSI;
const ADX = require('technicalindicators').ADX;
const RSI = require('technicalindicators').StochasticRSI;
const MFI = require('technicalindicators').MFI;
var rsis = []
var moreover = false
var morebelow = false
var rsiover = false;
var rsibelow = false;
var mfiover = false;
var mfibelow = false;
var adxover = false;
var adxbelow = false;
var rsi2over = false;
var rsi2below = false;
var a = 0
var b = 0;
var rsicount = 0;
var buysell = -1
var theRSI = []
var theMFI = []
var theRSI2 = []
setInterval(async function() {
    ohlcv = await client2.fetchOHLCV('BTC/USDT', timeframe = rsiTF, since = undefined, limit = 1000, params = {})
    //////console.log(ohlcv)
    var c = 0;
    var ohlcvs = []
    for (var b in ohlcv) {
        ohlcvs.push[ohlcv[b]]
        if (rsis[0] == undefined) {
            rsis[0] = []
        }
        rsis[0].push(ohlcv[b][4])
        if (rsis[0].length > 1000) {
            rsis[0].shift()
        }
    }
            high = []
        low = []
        close = []
        volume = []
        for (var o in ohlcv) {
            high.push(ohlcv[o][2])
            low.push(ohlcv[o][3])
            close.push(ohlcv[o][4])
            volume.push(ohlcv[o][5])
        }
        theMFI = MFI.calculate({
            period: 14,
            high: high,
            low: low,
            close: close,
            volume: volume
        });
        theADX = ADX.calculate({period: 14, high: high,
            low: low,
            close: close})
theRSI2 = RSI2.calculate({period: 14, values: rsis[0]})
    theRSI = RSI.calculate({
        rsiPeriod: period,
        stochasticPeriod: period,
        kPeriod: kvalue,
        dPeriod: dvalue,
        values: rsis[0]
    });

    //////console.log(theRSI[theRSI.length-1].k)
    
    //////console.log(theMFI[theMFI.length-1])
    ////console.log(theRSI[theRSI.length - 1].k)
    if (theRSI[theRSI.length - 1].k > highRSI) {
        rsiover = true;
    } else {
        rsiover = false;
    }
    if (theRSI[theRSI.length - 1].k < lowRSI) {
        rsibelow = true;
    } else {
        rsibelow = false;
    }

////console.log(theADX[theADX.length - 1].adx)
    if (theADX[theADX.length - 1].adx > highRSI) {
        adxover = true;
    } else {
        adxover = false;
    }
    if (theADX[theADX.length - 1].adx < lowRSI) {
        adxbelow = true;
    } else {
        adxbelow = false;
    }

    ////console.log(theMFI[theMFI.length - 1])
    if (theMFI[theMFI.length - 1] > highRSI) {
        mfiover = true;
    } else {
        mfiover = false;
    }
    if (theMFI[theMFI.length - 1] < lowRSI) {
        mfibelow = true;
    } else {
        mfibelow = false;
    }
    ////console.log(theRSI2[theRSI2.length - 1])
    if (theRSI2[theRSI2.length - 1] > highRSI) {
        rsi2over = true;
    } else {
        rsi2over = false;
    }
    if (theRSI2[theRSI2.length - 1] < lowRSI) {
        rsi2below = true;
    } else {
        rsi2below = false;
    }
    a++
    diff = price / index;
            diff = -1 * (1 - diff) * 100
            //console.log(diff)
            //console.log(minCrossSell)
            //console.log(moreover)
            //console.log(morebelow)
    abc123 = 0
    if (adxover == true){
        abc123++
    }
    if (rsiover == true){
        abc123++
    }
    if (rsi2over == true){
        abc123++
    }
    if (mfiover == true){
        abc123++
    }
    if (abc123 >= 2){
        moreover = true
    }
    else {
        moreover = false
    }
    abc123 = 0
    if (adxbelow == true){
        abc123++
    }
    if (rsibelow == true){
        abc123++
    }
    if (rsi2below == true){
        abc123++
    }
    if (mfibelow == true){
        abc123++
    }
    if (abc123 >= 2){
        morebelow = true
    }
    else {
        morebelow = false
    }
    if (a == 60) {
        a = 0;
        b++;
    }
    if (b == 1) {
        b = 0;
    }
    //////console.log(theRSI[theRSI.length-1].k)
}, 1000);

var above = 0;
var price = 0;
var index = 0;
var buying = 0;
var selling = 0;
var diff;
var tps = []
var sls = []
var tradesArr = []
var sltps = []
var openorders = []
setInterval(async function() {
    var split = false;
    for (var t in tps) {
        if (tps[t].price <= price && tps[t].direction == 'sell') {
            sltps.push(await client.createOrder('BTC/USDT', "Limit", 'sell', tps[t].amt, tps[t].price + 100))

            split = true
        }
        if (tps[t].price >= price && tps[t].direction == 'buy') {
            sltps.push(await client.createOrder('BTC/USDT', "Limit", 'buy', tps[t].amt, tps[t].price - 100))

            split = true
        }


    }
    if (split) {

        tps.splice(t, 1)
        sls.splice(t, 1)

    }

    split = false;
    for (var t in sls) {
        if (sls[t].price >= price && sls[t].direction == 'sell') {
            sltps.push(await client.createOrder('BTC/USDT', "Limit", 'sell', sls[t].amt, sls[t].price + 100))

            split = true
        }
        if (sls[t].price <= price && sls[t].direction == 'buy') {
            sltps.push(await client.createOrder('BTC/USDT', "Limit", 'buy', sls[t].amt, sls[t].price - 100))

            split = true
        }


    }
    if (split) {
        tps.splice(t, 1)
        sls.splice(t, 1)

    }
    var trades = await client.fapiPrivateGetUserTrades({
        'symbol': 'BTCUSDT',
        'limit': 1000
    })
    //////console.log(trades)
    //////console.log(tradesArr)
    for (var t in trades) {
        go = true;
        for (var s in sltps) {
            if (sltps[s].id == trades[t].orderId) {
                go = false;
            }
        }
        if (!tradesArr.includes(trades[t].id) && go) {
            tradesArr.push(trades[t].id)

if (trades[t].side == 'SELL'){
//sellTps.push({entry: parseFloat(trades[t].price),qty: parseFloat(trades[t].qty), price: parseFloat(trades[t].price) * (1 + (trailingTp / (100 * leverage)))})
}
else {
//buyTps.push({entry: parseFloat(trades[t].price),qty: parseFloat(trades[t].qty), price: parseFloat(trades[t].price) * (1 - (trailingTp / (100 * leverage)))})

}
            /*
    ////console.log(' ')
                ////console.log('enter tp!')
                ////console.log(' ')
                ////console.log(openorders)
                if (trades[t].side == 'SELL'){
                    

                    sls.push({'direction': 'buy','i': 'BTC/USDT',
  'amt': parseFloat(trades[t].qty),
 'price': parseFloat(trades[t].price)* 1.0045})

                    tps.push({'direction': 'buy','i': 'BTC/USDT',
  'amt': parseFloat(trades[t].qty),
 'price': parseFloat(trades[t].price)* (1-0.0025)})

                }
                else {
sls.push({'direction': 'sell','i': 'BTC/USDT',
  'amt': parseFloat(trades[t].qty),
 'price': parseFloat(trades[t].price)* (1-0.0045)})

                    tps.push({'direction': 'sell','i': 'BTC/USDT',
  'amt': parseFloat(trades[t].qty),
 'price': parseFloat(trades[t].price)* 1.0045})
}
        */
        }
    }
    //////console.log(await client.createOrder(  'BTC/USDT', "Limit", 'sell', 0.001, 8633))
}, 10000)

var dobuy = true;
var ohlcvs = []
var request = require('request');
async function doit() {
    if (keygood){


            if (price > index) {
                above = 1;
            } else {
                above = 0;
            }
            diff = price / index;
            diff = -1 * (1 - diff) * 100
            ////console.log(diff)
            if (diff < -1 * minCrossSell && moreover){
                console.log('it wants to sell 1')
                if (true){// && (freePerc < maxFreePerc || position > 0)) {
                    console.log('it wants to sell 2')
                    //selling = 1;
                    buysell = 0;
                    //buying = 0;
                    prc = HA
                    qtybtc = bal_btc * 50 / 50
                    qty = Math.floor(prc * qtybtc / 10) / HA
                    qty = qty * orderSizeMult
                    diff3 = diff
                    if (diff < 0){
                        diff3 = -1 * diff
                    }
                    ////console.log(diff3)
                    diff3 = diff3 / ((minCrossSell  + minCrossBuy) / 2)
                    qty = qty * diff3
                    if (position > 0) {
                        qty = qty * 2
                    }
                    if (dobuy) {
                        console.log('it wants to sell 3')
                        dobuy = false;
                        setTimeout(function() {
                            dobuy = true;
                        }, delaybetweenorder * 1000)

                        openorders.push(await client.createOrder('BTC/USDT', "Limit", 'sell', qty, prc))

                        //////console.log(openorders)
                        ////console.log(new Date() + ': diff: ' + diff + ' RSI: ' + theRSI[theRSI.length - 1].k + ' sell!') //ask
                    }
                }
            } else if (diff > minCrossBuy && diff < 100000 && morebelow){
                console.log('it wants to buy 1')
                if (true){// && (freePerc < maxFreePerc || position < 0)) {
                    console.log('it wants to buy 2')
                    //selling = 0;
                    //buying = 1;
                    buysell = 1;
                    prc = LB
                    qtybtc = bal_btc * 50 / 50
                    qty = Math.floor(prc * qtybtc / 10) / LB
                    qty = qty * orderSizeMult
                    if (position < 0) {
                        qty = qty * 2
                    }
                    if (dobuy) {
                        console.log('it wants to buy 3')
                        dobuy = false;
                        setTimeout(function() {
                            dobuy = true;
                        }, delaybetweenorder * 1000)

                        openorders.push(await client.createOrder('BTC/USDT', "Limit", 'buy', qty, prc))

                        //////console.log(openorders)

                        ////console.log(new Date() + ': diff: ' + diff + ' RSI: ' + theRSI[theRSI.length - 1].k + ' buy!') //bid

                    }
                }

            }
        }

    
}
setInterval(function(){
    doit()
},delaybetweenorder *1000)
setInterval(async function(){
//ticker1 = await bitmex.fetchTicker('BTC/USD')

//price = ticker1.lastPrice
//index=(ticker1.markPrice)


request.get('https://www.bitmex.com/api/v1/instrument?symbol=XBTUSD', function (e, r, d){
try {
j = JSON.parse(d)[0].lastPrice

j2 = JSON.parse(d)[0].markPrice
price=j
index=j2
}
catch (err){
    ////console.log(err)
}
})
}, 4000)
/*setInterval(function(){
    ////console.log(index)
    ////console.log(price)
}, 500) */
/*
ws.addStream('XBTUSD', 'instrument', async function(data, symbol, tableName) {
    if (data[0].lastPrice != undefined){
    price = (data[0].lastPrice)
}
    doit()
});

ws.addStream('.BXBT', 'instrument', async function(data, symbol, tableName) {
    if (data[0].lastPrice != undefined){
    index = (data[0].lastPrice)
}
    doit()
});
*/

