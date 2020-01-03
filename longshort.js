const ccxt = require('ccxt')
var long = new ccxt.binance({
    "apiKey": "ZhINcYLjV48smjoCqFQGPxQrf2XDUL3jM1iiplq9ymD1bEUKZ9KCmktGWkSgVKGH",
    "secret": "uNFw3vschOyZd7NZ6mO9c0mO7zPdQgAZNUL07Qx7nlErIz0b0gfyH7BX4970oc1x",
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
var gogogo = true
var bal_usd
var bal_init
var short = new ccxt.binance({
    "apiKey": "WShtsD87FTGdZDWfsqsT2jfTKuTNyB74qAptsOzrfUzboQxOtco0SMe8WdrkcIU4",
    "secret": "3xbkjfoNg00bGZ5xCNVCSbLYPoNBIGhUtFHky4dwlfnyjfecHuWbkQFC7Y9V0itE",
    "options": {
        "defaultMarket": "futures"
    },
    'urls': {
        'api': {
            'public': 'https://fapi.binance.com/fapi/v1',
            'private': 'https://fapi.binance.com/fapi/v1',
        },
    }
})
var position = 0
var whenorder = 0;
var belowMinHit = false
var aboveMinHit = false
var bal_btc = {}
var first = true
doupdate()

setInterval(async function() {
    doinitials()
}, 0.5 * 60 * 1000)

async function doinitials() {
   // console.log(position)
    positionl = 0
    positions = 0
    pos = await long.fapiPrivateGetPositionRisk()
    for (var p in pos) {
        leverage = parseFloat(pos[p]['leverage'])
        positionl += parseFloat(pos[p]['positionAmt'])
        leverage = parseFloat(pos[p]['leverage'])

        pnl = parseFloat(pos[p]['unRealizedProfit'])
        //console.log('pnl ' + pos[p]['symbol'] + ' : ' + pnl)
    }
    pos = await short.fapiPrivateGetPositionRisk()
    for (var p in pos) {
        leverage = parseFloat(pos[p]['leverage'])
        positions += parseFloat(pos[p]['positionAmt'])
        leverage = parseFloat(pos[p]['leverage'])
        pnl = parseFloat(pos[p]['unRealizedProfit'])
        //console.log('pnl ' + pos[p]['symbol'] + ' : ' + pnl)
    }
    //console.log(position)
    if (gogogo) {
        gogogo = false
        setTimeout(function() {
                gogogo = true;
            },
            1.5 * 60 * 1000)
    }
    //console.log('position: ' + position)
    gogogo = true
    account = await long.fetchBalance()
        account2 = await short.fetchBalance()
        ticker = await long.fetchTicker('BTC/USDT')
        LB = ticker.last + 0.5
        ////console.log(await long.fetchTicker( 'BTC/USDT' ))
        HA = ticker.last - 0.5
        last = ticker.last
        free_btc = 0
        free_btc['long'] = parseFloat(account['info']['totalInitialMargin']) / HA
        free_btc['short'] += parseFloat(account2['info']['totalInitialMargin']) / HA
        b1 = parseFloat(account['info']['totalMarginBalance'])
        b2 = parseFloat(account2['info']['totalMarginBalance'])

        bal_btc['long'] = b1 / HA
        bal_btc['short'] = b2 / HA
    if (positions <= 0.002 && positions > -0.002 && positionl <= 0.002 && positionl > -0.002 && gogogo) {
        account = await long.fetchBalance()
        account2 = await short.fetchBalance()
        ticker = await long.fetchTicker('BTC/USDT')
        LB = ticker.last + 0.5
        ////console.log(await long.fetchTicker( 'BTC/USDT' ))
        HA = ticker.last - 0.5
        last = ticker.last
        free_btc = 0
        free_btc['long'] = parseFloat(account['info']['totalInitialMargin']) / HA
        free_btc['short'] += parseFloat(account2['info']['totalInitialMargin']) / HA
        b1 = parseFloat(account['info']['totalMarginBalance'])
        b2 = parseFloat(account2['info']['totalMarginBalance'])

        bal_btc['long'] = b1 / HA
        bal_btc['short'] = b2 / HA
        //console.log(bal_btc)
        amt1 = leverage * bal_btc['long'] * 0.2
        amt2 = leverage * bal_btc['short'] * 0.2
        var amt = 0
        if (amt1 < amt2) {
            amt = amt1
        } else {
            amt = amt2
        }
        //console.log('buying/selling ' + amt + ' and creating TPs')
        await long.createOrder('BTC/USDT', "Limit", 'buy', amt, last + 100)
        await short.createOrder('BTC/USDT', "Limit", 'sell', amt, last - 100)
        longtps.push([amt, last * (1 + (0.0023))])
        shorttps.push([amt, last * (1 - (0.0023))])
    }
}
doinitials()
var position = 0;
var leverage = 0
var entryPrice
setInterval(async function() {
    //console.log(' ')
    //console.log(new Date)
    //console.log('usdbal: ' + bal_usd)
    position = 0
    pos = await long.fapiPrivateGetPositionRisk()
    for (var p in pos) {
        //console.log(pos[p]['unRealizedProfit'])

        position += parseFloat(pos[p]['positionAmt'])
        leverage = parseFloat(pos[p]['leverage'])

        pnl = parseFloat(pos[p]['unRealizedProfit'])

       // console.log('bal short: ' + balance['short'][pos[p]['symbol'] ])
      //  console.log('bal long: ' + balance['long'][pos[p]['symbol'] ])
       // console.log('pnl ' + pos[p]['symbol'] + ' : ' + pnl)
    }
    pos = await short.fapiPrivateGetPositionRisk()
    for (var p in pos) {

        position += parseFloat(pos[p]['positionAmt'])
        leverage = parseFloat(pos[p]['leverage'])

        pnl = parseFloat(pos[p]['unRealizedProfit'])
        //console.log('bal short: ' + balance['short'][pos[p]['symbol'] ])
        //console.log('bal long: ' + balance['long'][pos[p]['symbol'] ])
        //console.log('pnl ' + pos[p]['symbol'] + ' : ' + pnl)
    }
    pnlusd = -1 * ((bal_usd / bal_init) - 1) * 100
   // console.log('% gained/lost: ' + pnlusd)
}, 5 * 1000)
setInterval(function() {

    firsts++
    doupdate()
}, 60 * 0.5 * 1000)
var last;
var free_btc = {}
var freePerc = {}
async function cancelall() {
    ords = await short.fetchOpenOrders('ETH/USDT')

    for (var order in ords) {
        if (true) {
            oid = ords[order]['id']
            side = ords[order]['side']
            //if (buysell == 1 && side == 'buy'){
            //  //console.log('cancelleing2...')
            try {
                await short.cancelOrder(oid, 'ETH/USDT')
            } catch (e) {
                //console.log(e)

            }
            //}
            /* else if (buysell = 0 && side == 'sell'){
                try{
                     await client.cancelOrder( oid , 'ETH/USDT' )
                 }
                 catch (e){
                     //console.log(e)
                 
                 }
             }*/
        }
    }
    ords = await long.fetchOpenOrders('ETH/USDT')

    for (var order in ords) {
        if (true) {
            oid = ords[order]['id']
            side = ords[order]['side']
            //if (buysell == 1 && side == 'buy'){
            //  //console.log('cancelleing2...')
            try {
                await long.cancelOrder(oid, 'ETH/USDT')
            } catch (e) {
                //console.log(e)

            }
            //}
            /* else if (buysell = 0 && side == 'sell'){
                try{
                     await client.cancelOrder( oid , 'ETH/USDT' )
                 }
                 catch (e){
                     //console.log(e)
                 
                 }
             }*/
        }
    }

}
var balance = {}
var longtps = []
var shorttps = []
var firsts = 0

async function doupdate() {
    cancelall()
    var syms = ['BTCUSDT']//,'ETHUSDT']
    firsts++
    //console.log('firsts: ' + firsts)
    if (first) {
        
                cancelall()
        first = false;
    //console.log(syms)

        account = await long.fetchBalance()
        account2 = await short.fetchBalance()
        pos = await long.fapiPrivateGetPositionRisk()
        ////console.log(pos)
        for (var p in pos) {
            if (pos[p] != undefined) {
                entryPrice += parseFloat(pos[p]['entryPrice'])

                position += parseFloat(pos[p]['positionAmt'])
                leverage = parseFloat(pos[p]['leverage'])
                pnl = parseFloat(pos[p]['unRealizedProfit'])
                pos = await long.fapiPrivateGetPositionRisk()

                if (balance['long'] == undefined) {
                    balance['long'] = {}
                }
                if (balance['short'] == undefined) {
                    balance['short'] = {}
                }
                pos2 = await short.fapiPrivateGetPositionRisk()
                balance['long'][pos2[p]['symbol']] = position
                for (var pa in pos2) {
                    balance['short'][pos2[pa]['symbol']] = parseFloat(pos2[pa]['positionAmt'])
                }
            }

        }
        for (var sym in syms) {
            //console.log(syms[sym])

            val = balance['short'][syms[sym]]
            if (val < 0) {
                val = val * -1
            }
            val2 = balance['long'][syms[sym]]
            if (val2 < 0) {
                val2 = val2 * -1
            }
            await cancelall()
            if (balance['short'][syms[sym]] < 0) {
                console.log(syms[sym] + ' market short buy order for: ' + val)
                await short.createOrder(syms[sym].split('USDT')[0] + '/USDT', "Market", 'buy', val)
            }
            if (balance['short'][syms[sym]] > 0) {
                await short.createOrder(syms[sym].split('USDT')[0] + '/USDT', "Market", 'sell', val)

               console.log(syms[sym] + ' market short sell order for: ' + val)
            }
            if (balance['long'][syms[sym]] < 0) {

               console.log(syms[sym] + ' market long buy order for: ' + val2)
                await long.createOrder(syms[sym].split('USDT')[0] + '/USDT', "Market", 'buy', val2)
            }
            if (balance['long'][syms[sym]] > 0) {
               console.log(syms[sym] + ' market long sell order for: ' + val2)
                await long.createOrder(syms[sym].split('USDT')[0] + '/USDT', "Market", 'sell', val2)

            }
        }
    }
    //console.log(longtps)
    for (var sym in syms) {
        for (var t in longtps) { //10000 11000
            if (longtps[t][1] < last) {
                //console.log('tp')
                val = longtps[t][0]
                if (val < 0) {
                    val = val * -1
                }
                //console.log(longtps[t][1])
                //console.log(last)
                console.log('long tp')
                await short.createOrder(syms[sym].split('USDT')[0] + '/USDT', "Limit", 'sell', val, last - 100)

                await long.createOrder(syms[sym].split('USDT')[0] + '/USDT', "Limit", 'sell', val, last - 100)
                longtps.splice(longtps[t], 1)
                shorttps.push([val, last * (1 - (0.0023))])

            }

        }
        for (var t in shorttps) {
            if (shorttps[t][1] > last) { //10000 9900
                //console.log(shorttps[t][1])
                //console.log(last)
                console.log('short tp')
                                val = shorttps[t][0]
                if (val < 0) {
                    val = val * -1
                }
                await short.createOrder(syms[sym].split('USDT')[0] + '/USDT', "Limit", 'buy', val, last + 100)
                await long.createOrder(syms[sym].split('USDT')[0] + '/USDT', "Limit", 'buy', val, last + 100)
                shorttps.splice(shorttps[t], 1)

                longtps.push([val, last * (1 + (0.0023))])
            }
        }

    }
    account = await long.fetchBalance()
    account2 = await short.fetchBalance()
    ticker = await long.fetchTicker('BTC/USDT')
    LB = ticker.last + 0.5
    ////console.log(await long.fetchTicker( 'BTC/USDT' ))
    HA = ticker.last - 0.5
    last = ticker.last
    //console.log(last)
    free_btc = 0
    free_btc['long'] = parseFloat(account['info']['totalInitialMargin']) / HA
    free_btc['short'] += parseFloat(account2['info']['totalInitialMargin']) / HA
    b1 = parseFloat(account['info']['totalMarginBalance'])
    b2 = parseFloat(account2['info']['totalMarginBalance'])
    bal_btc['long'] += b1 / HA
    bal_btc['short'] += b2 / HA

    freePerc['long'] = (free_btc['long'] / bal_btc['long'])

    freePerc['short'] = (free_btc['short'] / bal_btc['short'])

    bal_usd = parseFloat(account['info']['totalMarginBalance'])

    bal_usd += parseFloat(account2['info']['totalMarginBalance'])
    if (first) {
        bal_init = bal_usd
    }
    position = 0;
    entryPrice = 0;
    pos = await long.fapiPrivateGetPositionRisk()
    ////console.log(pos)
    for (var p in pos) {
        if (pos[p] != undefined) {
            entryPrice += parseFloat(pos[p]['entryPrice'])

            position += parseFloat(pos[p]['positionAmt'])
            leverage = parseFloat(pos[p]['leverage'])
            pnl = parseFloat(pos[p]['unRealizedProfit'])
            pos = await long.fapiPrivateGetPositionRisk()

            if (balance['long'] == undefined) {
                balance['long'] = {}
            }
            if (balance['short'] == undefined) {
                balance['short'] = {}
            }
            pos2 = await short.fapiPrivateGetPositionRisk()
            balance['long'][pos2[p]['symbol']] = position
        }
    }
    for (var pa in pos2) {
        balance['short'][pos2[pa]['symbol']] = parseFloat(pos2[pa]['positionAmt'])
        if (pos2[pa] != undefined) {
            entryPrice += parseFloat(pos2[pa]['entryPrice'])

            position2 = parseFloat(pos2[pa]['positionAmt'])
            leverage = parseFloat(pos2[pa]['leverage'])

            pnl = parseFloat(pos2[pa]['unRealizedProfit'])
            ////console.log(pnl)
            if (pnl < -0.05 && balance['long'][pos2[pa]['symbol']] > 0) { //long, losing
                buycheck++

            } 
            if (pnl < -0.05 && balance['long'][pos2[pa]['symbol']] < 0) { //long, losing
                sellcheck++
            }
            //console.log('buycheck: ' + buycheck)
            //console.log('sellcheck: ' + sellcheck)
            //console.log('pnl: ' + pnl)
            //console.log(leverage)
            //console.log(leverage * bal_btc['long'] * 0.2)
            //console.log(last + 100)
            //console.log(position2)
            //console.log(position)
            if (buycheck >= 1) {
                cancelall()
               /* if (balance['long'][pos2[pa]['symbol']] > 0 && buycheck >= 2 && pnl > -0.05 && pnl != 0) {
                    buycheck = 0
                    sellcheck = 0
                    amt = leverage * bal_btc['long'] * 0.2
                    sym = pos2[pa]['symbol'].split('USDT')[0] + '/USDT'
                    console.log('buycheck buying long selling short interval match')
                    await long.createOrder(sym, "Limit", 'buy', amt, last + 100)
                    await short.createOrder(sym, "Limit", 'sell', position2, last - 100)
                    longtps.push([amt, last * (1 + (0.0023))])
                }
                if (balance['long'][pos2[pa]['symbol']] < 0 && buycheck >= 2 && pnl > -0.05 && pnl != 0) {
                    buycheck = 0
                    sellcheck = 0
                    amt = leverage * bal_btc['short'] * 0.2
                    console.log('buycheck buying short selling long interval match')
                    sym = pos2[pa]['symbol'].split('USDT')[0] + '/USDT'
                    await short.createOrder(sym, "Limit", 'buy', amt, last + 100)
                    await long.createOrder(sym, "Limit", 'sell', position, last - 100)
                    shorttps.push([amt, last * (1 - (0.0023))])
                } */
            }
            if (sellcheck >= 1) {
                cancelall()
                if (balance['short'][pos2[pa]['symbol']] > 0 && sellcheck >= 2 && pnl > -0.05 && pnl != 0) {
                    buycheck = 0
                    sellcheck = 0
                    amt = leverage * bal_btc['long'] * 0.2
                    console.log('sellcheck buying long selling short interval match')
                    sym = pos2[pa]['symbol'].split('USDT')[0] + '/USDT'
                    if (position2 < 0){
                        doit = position2 * -1
                    }
                    else {
                        doit = position2
                    }
                    await long.createOrder(sym, "Limit", 'buy', amt, last + 100)
                    await short.createOrder(sym, "Limit", 'buy', doit, last + 100)
                    longtps.pop()
                    longtps.push([amt, last * (1 + (0.0023))])
                    shorttps.pop()
                }
                if (balance['short'][pos2[pa]['symbol']] < 0 && sellcheck >= 2 && pnl > -0.05 && pnl != 0) {
                    buycheck = 0
                    sellcheck = 0
                    amt = leverage * bal_btc['short'] * 0.2
                    console.log('sellcheck buying short selling long interval match')
                    sym = pos2[pa]['symbol'].split('USDT')[0] + '/USDT'
                    if (position < 0){
                        doit = position * -1
                    }
                    else {
                        doit = position
                    }
                    shorttps.pop()
                    await short.createOrder(sym, "Limit", 'sell', amt, last + 100)
                    await long.createOrder(sym, "Limit", 'sell', doit, last - 100)
                    shorttps.push([amt, last * (1 - (0.0023))])
                    longtps.pop()
                }
            }

        }

    }
    for (var p in pos) {
        ////console.log(pnl)
        if (pos[p] != undefined) {
            entryPrice += parseFloat(pos[p]['entryPrice'])

            position2 = parseFloat(pos[p]['positionAmt'])
            leverage = parseFloat(pos[p]['leverage'])

            pnl = parseFloat(pos[p]['unRealizedProfit'])
            ////console.log(pnl)
            if (pnl < -0.05 && balance['short'][pos2[pa]['symbol']] > 0) { //long, losing
                buycheck2++

            } 
            if (pnl < -0.05 && balance['short'][pos2[pa]['symbol']] < 0) { //long, losing
                sellcheck2++
            } 
            //console.log('buycheck: ' + buycheck2)
            //console.log('sellcheck: ' + sellcheck2)
            //console.log('pnl: ' + pnl)
            if (buycheck2 >= 1) {
                cancelall()
                if (balance['long'][pos[p]['symbol']] > 0 && buycheck2 >= 2 && pnl > -0.05 && pnl != 0) {
                    buycheck2= 0
                    sellcheck2= 0
                    amt = leverage * bal_btc['long'] * 0.2
                    sym = pos[p]['symbol'].split('USDT')[0] + '/USDT'
                    if (position2 < 0){
                        doit = position2 * -1
                    }
                    else {
                        doit = position2
                    }
                    shorttps.pop()
                    await long.createOrder(sym, "Limit", 'sell', amt, last - 100)
                    await short.createOrder(sym, "Limit", 'sell', doit, last - 100)
                    shorttps.push([amt, last * (1 - (0.0023))])
                    longtps.pop()
                }
                if (balance['long'][pos[p]['symbol']] < 0 && buycheck2 >= 2 && pnl > -0.05 && pnl != 0) {
                    buycheck2 = 0
                    sellcheck2 = 0
                    if (position < 0){
                        doit = position * -1
                    }
                    else {
                        doit = position
                    }
                    amt = leverage * bal_btc['short'] * 0.2
                    sym = pos[p]['symbol'].split('USDT')[0] + '/USDT'
                    await short.createOrder(sym, "Limit", 'buy', amt, last + 100)
                    await long.createOrder(sym, "Limit", 'buy', doit, last + 100)
                    longtps.pop()
                    longtps.push([amt, last * (1 + (0.0023))])
                    shorttps.pop()
                }
            }
            if (sellcheck >= 1) {
                cancelall()
                /*
                if (balance['short'][pos[p]['symbol']] > 0 && sellcheck2 >= 2 && pnl > -0.05 && pnl != 0) {
                    buycheck2 = 0
                    sellcheck2 = 0
                    amt = leverage * bal_btc['long'] * 0.2
                    sym = pos[p]['symbol'].split('USDT')[0] + '/USDT'
                    await long.createOrder(sym, "Limit", 'buy', amt, last + 100)
                    await short.createOrder(sym, "Limit", 'sell', position2, last - 100)
                    longtps.push([amt, last * (1 + (0.0023))])
                }
                if (balance['short'][pos[p]['symbol']] < 0 && sellcheck2 >= 2 && pnl > -0.05 && pnl != 0) {
                    buycheck2 = 0
                    sellcheck2 = 0
                    amt = leverage * bal_btc['short'] * 0.2
                    sym = pos[p]['symbol'].split('USDT')[0] + '/USDT'
                    await short.createOrder(sym, "Limit", 'buy', amt, last + 100)
                    await long.createOrder(sym, "Limit", 'sell', position, last - 100)
                    shorttps.push([amt, last * (1 - (0.0023))])
                } */
            }


        }
    }
}
var buycheck = 0
var sellcheck = 0
var buycheck2 = 0
var sellcheck2 = 0
var shortmin = false
var longmin = false