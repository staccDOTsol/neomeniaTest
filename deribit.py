# This code is for sample purposes only, comes as is and with no warranty or guarantee of performance
import json
from collections    import OrderedDict
from datetime       import datetime
from os.path        import getmtime
from time           import sleep
from utils          import ( get_logger, lag, print_dict, print_dict_of_dicts, sort_by_key,
                             ticksize_ceil, ticksize_floor, ticksize_round )
import ccxt
import requests
import pandas as pd
from finta import TA

import json
import copy as cp
import argparse, logging, math, os, pathlib, sys, time, traceback

try:
    from deribit_api    import RestClient
except ImportError:
    print("Please install the deribit_api pacakge", file=sys.stderr)
    print("    pip3 install deribit_api", file=sys.stderr)
    exit(1)

# Add command line switches
parser  = argparse.ArgumentParser( description = 'Bot' )

# Use production platform/account
parser.add_argument( '-p',
                     dest   = 'use_prod',
                     action = 'store_true' )

# Do not display regular status updates to terminal
parser.add_argument( '--no-output',
                     dest   = 'output',
                     action = 'store_false' )

# Monitor account only, do not send trades
parser.add_argument( '-m',
                     dest   = 'monitor',
                     action = 'store_true' )

# Do not restart bot on errors
parser.add_argument( '--no-restart',
                     dest   = 'restart',
                     action = 'store_false' )

args    = parser.parse_args()
URL     = 'https://www.deribit.com'#ctrl+h!!!!!

KEY     = 'ahlhmWhF'
SECRET  = '3yzGBj0ae79G0O3iHfNEaucqnX-qUKAtkf3l_H3Qzsg'

BP                  = 1e-4      # one basis point
BTC_SYMBOL          = 'btc'
CONTRACT_SIZE       = 10        # USD
COV_RETURN_CAP      = 100       # cap on variance for vol estimate
DECAY_POS_LIM       = 0.1       # position lim decay factor toward expiry
EWMA_WGT_COV        = 70         # parameter in % points for EWMA volatility estimate
EWMA_WGT_LOOPTIME   = .6      # parameter for EWMA looptime estimate
FORECAST_RETURN_CAP = 20        # cap on returns for vol estimate
LOG_LEVEL           = logging.INFO
MIN_ORDER_SIZE      = 5
MAX_LAYERS          =  2        # max orders to layer the ob with on each side
MKT_IMPACT          =  0      # base 1-sided spread between bid/offer
NLAGS               =  2        # number of lags in time series
PCT                 = 100 * BP  # one percentage point
PCT_LIM_LONG        = 12       # % position limit long
PCT_LIM_SHORT       = 16       # % position limit short
PCT_QTY_BASE        = 200     # pct order qty in bps as pct of acct on each order
MIN_LOOP_TIME       =   0.1       # Minimum time between loops
RISK_CHARGE_VOL     =   7.5   # vol risk charge in bps per 100 vol
SECONDS_IN_DAY      = 3600 * 24
SECONDS_IN_YEAR     = 365 * SECONDS_IN_DAY
WAVELEN_MTIME_CHK   = 15        # time in seconds between check for file change
WAVELEN_OUT         = 15        # time in seconds between output to terminal
WAVELEN_TS          = 15        # time in seconds between time series update
VOL_PRIOR           = 150       # vol estimation starting level in percentage pts

EWMA_WGT_COV        *= PCT
MKT_IMPACT          *= BP
PCT_LIM_LONG        *= PCT
PCT_LIM_SHORT       *= PCT
PCT_QTY_BASE        *= BP
VOL_PRIOR           *= PCT


class MarketMaker( object ):
    
    def __init__( self, monitor = True, output = True ):
        self.equity_usd         = None
        self.equity_btc         = None
        self.eth = 0
        self.equity_usd_init    = None
        self.equity_btc_init    = None
        self.con_size           = float( CONTRACT_SIZE )
        self.client             = None
        self.deltas             = OrderedDict()
        self.futures            = OrderedDict()
        self.futures_prv        = OrderedDict()
        self.logger             = None
        self.volatility = 0
        self.price = 0
        self.buysellsignal = 1
        self.directional = 0
        self.dsrsi = 50
        self.mean_looptime      = 1
        self.monitor            = monitor
        self.output             = output or monitor
        self.positions          = OrderedDict()
        self.spread_data        = None
        self.this_mtime         = None
        self.ts                 = None
        self.vols               = OrderedDict()
        self.multsShort = {}
        self.multsLong = {}
    
    def create_client( self ):
        self.client = RestClient( KEY, SECRET, URL )
        
    
    def get_bbo( self, contract ): # Get best b/o excluding own orders
        if self.directional == 1:
            sleep(1)
            ohlcv = requests.get('https://www.deribit.com/api/v2/public/get_tradingview_chart_data?instrument_name=' + contract + '&start_timestamp=' + str(int(time.time()) * 1000 - 1000 * 60 * 60) + '&end_timestamp=' + str(int(time.time())* 1000) + '&resolution=1')
            j = ohlcv.json()
            print(contract)
            o = []
            h = []
            l = []
            c = []
            v = []
            for b in j['result']['open']:
                o.append( b )
        
            for b in j['result']['high']:
                h.append(b)
            for b in j['result']['low']:
                l.append(b)
            for b in j['result']['close']:
                c.append(b)
            for b in j['result']['volume']:
                v.append(b)
            abc = 0
            ohlcv2 = []
            for b in j['result']['open']:
                ohlcv2.append([o[abc], h[abc], l[abc], c[abc], v[abc]])
                abc = abc + 1
        
            ddf = pd.DataFrame(ohlcv2, columns=['open', 'high', 'low', 'close', 'volume'])
            try:
                self.dsrsi = TA.STOCHRSI(ddf).iloc[-1] * 100
            except: 
                self.dsrsi = 50           
            #print(self.dsrsi)
        # Get orderbook
        if self.price == 0:
            ob      = self.client.getorderbook( contract )
            bids    = ob[ 'bids' ]
            asks    = ob[ 'asks' ]
            
            ords        = self.client.getopenorders( contract )
            bid_ords    = [ o for o in ords if o[ 'direction' ] == 'buy'  ]
            ask_ords    = [ o for o in ords if o[ 'direction' ] == 'sell' ]
            best_bid    = None
            best_ask    = None

            err = 10 ** -( self.get_precision( contract ) + 1 )
            
            for b in bids:
                match_qty   = sum( [ 
                    o[ 'quantity' ] for o in bid_ords 
                    if math.fabs( b[ 'price' ] - o[ 'price' ] ) < err
                ] )
                if match_qty < b[ 'quantity' ]:
                    best_bid = b[ 'price' ]
                    break
            
            for a in asks:
                match_qty   = sum( [ 
                    o[ 'quantity' ] for o in ask_ords 
                    if math.fabs( a[ 'price' ] - o[ 'price' ] ) < err
                ] )
                if match_qty < a[ 'quantity' ]:
                    best_ask = a[ 'price' ]
                    break
            
            return { 'bid': best_bid, 'ask': best_ask }
        elif self.price == 1:
            sleep(1)
            ohlcv = requests.get('https://www.deribit.com/api/v2/public/get_tradingview_chart_data?instrument_name=' + contract + '&start_timestamp=' + str(int(time.time()) * 1000 - 1000 * 60 * 60) + '&end_timestamp=' + str(int(time.time())* 1000) + '&resolution=1')
            j = ohlcv.json()
            o = []
            h = []
            l = []
            c = []
            v = []
            for b in j['result']['open']:
                o.append( b )
        
            for b in j['result']['high']:
                h.append(b)
            for b in j['result']['low']:
                l.append(b)
            for b in j['result']['close']:
                c.append(b)
            for b in j['result']['volume']:
                v.append(b)
            abc = 0
            ohlcv2 = []
            for b in j['result']['open']:
                ohlcv2.append([o[abc], h[abc], l[abc], c[abc], v[abc]])
                abc = abc + 1
        
            ddf = pd.DataFrame(ohlcv2, columns=['open', 'high', 'low', 'close', 'volume'])
            dvwap = TA.VWAP(ddf)
            tsz = self.get_ticksize( contract ) 
            try:   
                bid = ticksize_floor( dvwap.iloc[-1], tsz )
                ask = ticksize_ceil( dvwap.iloc[-1], tsz )
            except:
                bid = ticksize_floor( self.get_spot(), tsz )
                ask = ticksize_ceil( self.get_spot(), tsz )
           
            print( { 'bid': bid, 'ask': ask })
            return { 'bid': bid, 'ask': ask }
        elif self.price == 2:
            sleep(1)
            ohlcv = requests.get('https://www.deribit.com/api/v2/public/get_tradingview_chart_data?instrument_name=' + contract + '&start_timestamp=' + str(int(time.time()) * 1000 - 1000 * 60 * 60) + '&end_timestamp=' + str(int(time.time())* 1000) + '&resolution=1')
            j = ohlcv.json()
            o = []
            h = []
            l = []
            c = []
            v = []
            for b in j['result']['open']:
                o.append( b )
        
            for b in j['result']['high']:
                h.append(b)
            for b in j['result']['low']:
                l.append(b)
            for b in j['result']['close']:
                c.append(b)
            for b in j['result']['volume']:
                v.append(b)
            abc = 0
            ohlcv2 = []
            for b in j['result']['open']:
                ohlcv2.append([o[abc], h[abc], l[abc], c[abc], v[abc]])
                abc = abc + 1
        
            ddf = pd.DataFrame(ohlcv2, columns=['open', 'high', 'low', 'close', 'volume'])
            dppo = TA.PPO(ddf)
            self.buysellsignal = 1
            try:
                if(dppo.iloc[-1].PPO > 0):
                    self.buysellsignal = self.buysellsignal * 1.2
                else:
                    self.buysellsignal = self.buysellsignal * 0.8

                if(dppo.iloc[-1].HISTO > 0):
                    self.buysellsignal = self.buysellsignal* 1.2
                else:
                    self.buysellsignal = self.buysellsignal * 0.8
                if(dppo.iloc[-1].SIGNAL > 0):
                    self.buysellsignal = self.buysellsignal * 1.2
                else:
                    self.buysellsignal = self.buysellsignal * 0.8

                print(self.buysellsignal)
            except:
                self.buysellsignal = 1
            ob      = self.client.getorderbook( contract )
            bids    = ob[ 'bids' ]
            asks    = ob[ 'asks' ]
            
            ords        = self.client.getopenorders( contract )
            bid_ords    = [ o for o in ords if o[ 'direction' ] == 'buy'  ]
            ask_ords    = [ o for o in ords if o[ 'direction' ] == 'sell' ]
            best_bid    = None
            best_ask    = None

            err = 10 ** -( self.get_precision( contract ) + 1 )
            
            for b in bids:
                match_qty   = sum( [ 
                    o[ 'quantity' ] for o in bid_ords 
                    if math.fabs( b[ 'price' ] - o[ 'price' ] ) < err
                ] )
                if match_qty < b[ 'quantity' ]:
                    best_bid = b[ 'price' ]
                    break
            
            for a in asks:
                match_qty   = sum( [ 
                    o[ 'quantity' ] for o in ask_ords 
                    if math.fabs( a[ 'price' ] - o[ 'price' ] ) < err
                ] )
                if match_qty < a[ 'quantity' ]:
                    best_ask = a[ 'price' ]
                    break
            
            return { 'bid': best_bid, 'ask': best_ask }
        

    def get_futures( self ): # Get all current futures instruments
        
        self.futures_prv    = cp.deepcopy( self.futures )
        insts               = self.client.getinstruments()
        self.futures        = sort_by_key( { 
            i[ 'instrumentName' ]: i for i in insts  if ('BTC-' in i['instrumentName'] or 'ETH-PERPETUAL' in  i['instrumentName'] ) and i[ 'kind' ] == 'future'#  
        } )
        
        for k, v in self.futures.items():
            self.futures[ k ][ 'expi_dt' ] = datetime.strptime( 
                                                v[ 'expiration' ][ : -4 ], 
                                                '%Y-%m-%d %H:%M:%S' )
                        
        
    def get_pct_delta( self ):         
        self.update_status()
        return sum( self.deltas.values()) / self.equity_btc
    
    def get_spot( self ):
        return self.client.index()[ 'btc' ]

    
    def get_precision( self, contract ):
        return self.futures[ contract ][ 'pricePrecision' ]

    
    def get_ticksize( self, contract ):
        return self.futures[ contract ][ 'tickSize' ]
    
    
    def output_status( self ):
        
        if not self.output:
            return None
        
        self.update_status()
        
        now     = datetime.utcnow()
        days    = ( now - self.start_time ).total_seconds() / SECONDS_IN_DAY
        print( '********************************************************************' )
        print( 'Start Time:        %s' % self.start_time.strftime( '%Y-%m-%d %H:%M:%S' ))
        print( 'Current Time:      %s' % now.strftime( '%Y-%m-%d %H:%M:%S' ))
        print( 'Days:              %s' % round( days, 1 ))
        print( 'Hours:             %s' % round( days * 24, 1 ))
        print( 'Spot Price:        %s' % self.get_spot())
        
        
        pnl_usd = self.equity_usd - self.equity_usd_init
        pnl_btc = self.equity_btc - self.equity_btc_init
        
        print( 'Equity ($):        %7.2f'   % self.equity_usd)
        print( 'P&L ($)            %7.2f'   % pnl_usd)
        print( 'Equity (BTC):      %7.4f'   % self.equity_btc)
        print( 'P&L (BTC)          %7.4f'   % pnl_btc)
        #print( '%% Delta:           %s%%'% round( self.get_pct_delta() / PCT, 1 ))
        #print( 'Total Delta (BTC): %s'   % round( sum( self.deltas.values()), 2 ))        
        #print_dict_of_dicts( {
        #    k: {
        #        'BTC': self.deltas[ k ]
        #    } for k in self.deltas.keys()
        #    }, 
        #    roundto = 2, title = 'Deltas' )
        
        print_dict_of_dicts( {
            k: {
                'Contracts': self.positions[ k ][ 'size' ]
            } for k in self.positions.keys()
            }, 
            title = 'Positions' )
        
        if not self.monitor:
            print_dict_of_dicts( {
                k: {
                    '%': self.vols[ k ]
                } for k in self.vols.keys()
                }, 
                multiple = 100, title = 'Vols' )
            print( '\nMean Loop Time: %s' % round( self.mean_looptime, 2 ))
        data = {}
        for k in self.positions.keys():
            data[k] = self.positions[ k ][ 'size' ]
        with open('deribit.json', 'w') as outfile:
            json.dump(data, outfile)
        with open('bitmex.json') as json_file:
            data = json.load(json_file)


#ETH-26JUN20      16
#ETH-27DEC19       2
#ETH-27MAR20      11
#ETH-PERPETUAL     4

            self.multsShort['ETH-PERPETUAL'] = 1
            self.multsShort['BTC-PERPETUAL'] = 1
            self.multsShort['BTC-27MAR20'] = 1
            self.multsShort['BTC-26JUN20'] = 1
            self.multsShort['BTC-27DEC19'] = 1

            self.multsLong['ETH-PERPETUAL'] = 1
            self.multsLong['BTC-PERPETUAL'] = 1
            self.multsLong['BTC-27MAR20'] = 1
            self.multsLong['BTC-26JUN20'] = 1
            self.multsLong['BTC-27DEC19'] = 1
            if data['ETH-PERPETUAL'] > 0:
                self.multsShort['ETH-PERPETUAL'] = 1.5
            if data['ETH-PERPETUAL'] < 0:
                self.multsLong['ETH-PERPETUAL'] = 1.5
            
            if data['BTC-PERPETUAL'] > 0:
                self.multsShort['BTC-PERPETUAL'] = 1.5
            if data['BTC-PERPETUAL'] < 0:
                self.multsLong['BTCA-PERPETUAL'] = 1.5

            if data['BTC-27MAR20'] > 0:
                print('short more march')
                self.multsShort['BTC-27MAR20'] = 1.5
            if data['BTC-27MAR20'] < 0:
                print('long more march')
                self.multsLong['BTC-27MAR20'] = 1.5

            if data['BTC-26JUN20'] > 0:
                self.multsShort['BTC-26JUN20'] = 1.5
            if data['BTC-26JUN20'] < 0:
                self.multsLong['BTC-26JUN20'] = 1.5

            if data['BTC-27DEC19'] > 0:
                self.multsShort['BTC-27DEC19'] = 1.5
            if data['BTC-27DEC19'] < 0:
                self.multsLong['BTC-27DEC19'] = 1.5
        print( '' )

        
    def place_orders( self ):

        if self.monitor:
            return None
        
        con_sz  = self.con_size        
        
        for fut in self.futures.keys():
            
            account         = self.client.account()

            spot            = self.get_spot()
            bal_btc         = account[ 'equity' ] * 100
            pos_lim_long    = bal_btc * PCT_LIM_LONG / len(self.futures)
            pos_lim_short   = bal_btc * PCT_LIM_SHORT / len(self.futures)
            expi            = self.futures[ fut ][ 'expi_dt' ]
            #print(self.futures[ fut ][ 'expi_dt' ])
            if self.eth is 0:
                self.eth = 200
            if 'ETH' in fut:
                if 'sizeEth' in self.positions[fut]:
                    pos             = self.positions[ fut ][ 'sizeEth' ] * self.eth / self.get_spot() 
                else:
                    pos = 0
            else:
                pos             = self.positions[ fut ][ 'sizeBtc' ]

            tte             = max( 0, ( expi - datetime.utcnow()).total_seconds() / SECONDS_IN_DAY )
            pos_decay       = 1.0 - math.exp( -DECAY_POS_LIM * tte )
            pos_lim_long   *= pos_decay
            pos_lim_short  *= pos_decay
            pos_lim_long   -= pos
            pos_lim_short  += pos
            pos_lim_long    = max( 0, pos_lim_long  )
            pos_lim_short   = max( 0, pos_lim_short )
            
            min_order_size_btc = MIN_ORDER_SIZE / spot * CONTRACT_SIZE
            
            qtybtc  = max( PCT_QTY_BASE  * bal_btc, min_order_size_btc)

            nbids   = min( math.trunc( pos_lim_long  / qtybtc ), MAX_LAYERS )
            nasks   = min( math.trunc( pos_lim_short / qtybtc ), MAX_LAYERS )
            
            place_bids = nbids > 0
            place_asks = nasks > 0
            #buy bid sell ask
            if self.dsrsi > 80: #over
                place_bids = 0
            if self.dsrsi < 20: #under
                place_asks = 0
            if not place_bids and not place_asks:
                print( 'No bid no offer for %s' % fut, min_order_size_btc )
                continue
                
            tsz = self.get_ticksize( fut )            
            # Perform pricing
            vol = max( self.vols[ BTC_SYMBOL ], self.vols[ fut ] )
            if self.volatility == 1:
                eps         = BP * vol * RISK_CHARGE_VOL
            elif self.volatility == 0:
                eps = BP * 0.5 * RISK_CHARGE_VOL
            riskfac     = math.exp( eps )
            bbo     = self.get_bbo( fut )
            bid_mkt = bbo[ 'bid' ]
            ask_mkt = bbo[ 'ask' ]
            mid = 0.5 * ( bbo[ 'bid' ] + bbo[ 'ask' ] )

            mid_mkt = 0.5 * ( bid_mkt + ask_mkt )
            
            ords        = self.client.getopenorders( fut )
            cancel_oids = []
            bid_ords    = ask_ords = []
            
            if place_bids:
                
                bid_ords        = [ o for o in ords if o[ 'direction' ] == 'buy'  ]
                len_bid_ords    = min( len( bid_ords ), nbids )
                bid0            = mid_mkt * math.exp( -MKT_IMPACT )
                bids    = [ bid0 * riskfac ** -i for i in range( 1, nbids + 1 ) ]

                bids[ 0 ]   = ticksize_floor( bids[ 0 ], tsz )
                
            if place_asks:
                
                ask_ords        = [ o for o in ords if o[ 'direction' ] == 'sell' ]    
                len_ask_ords    = min( len( ask_ords ), nasks )
                ask0            = mid_mkt * math.exp(  MKT_IMPACT )
                asks    = [ ask0 * riskfac ** i for i in range( 1, nasks + 1 ) ]

                asks[ 0 ]   = ticksize_ceil( asks[ 0 ], tsz  )
            for i in range( max( nbids, nasks )):
                # BIDS
                print('nbids')
                print(nbids)
                print('nasks')
                print(nasks)
                if place_bids and i < nbids:

                    if i > 0:
                        prc = ticksize_floor( min( bids[ i ], bids[ i - 1 ] - tsz ), tsz )
                    else:
                        prc = bids[ 0 ]

                    qty = round( prc * qtybtc / (con_sz / 1) )                        
                    if 'ETH' in fut:
                        qty = round( prc * 450 * qtybtc / (con_sz / 1) ) 
                    qty = round ( qty * self.buysellsignal)   
                    qty = round (qty * self.multsLong[fut])
                    print(fut)
                    print(self.dsrsi)
                    print(qty)        
                    if i < len_bid_ords:    

                        oid = bid_ords[ i ][ 'orderId' ]
                        try:
                            self.client.edit( oid, qty, prc )
                        except (SystemExit, KeyboardInterrupt):
                            raise
                        except:
                            try:
                                self.client.buy(  fut, qty, prc, 'true' )
                                cancel_oids.append( oid )
                                self.logger.warn( 'Edit failed for %s' % oid )
                            except (SystemExit, KeyboardInterrupt):
                                raise
                            except Exception as e:
                                self.logger.warn( 'Bid order failed: %s bid for %s'
                                                % ( prc, qty ))
                    else:
                        try:
                            self.client.buy(  fut, qty, prc, 'true' )
                        except (SystemExit, KeyboardInterrupt):
                            raise
                        except Exception as e:
                            self.logger.warn( 'Bid order failed: %s bid for %s'
                                                % ( prc, qty ))

                # OFFERS

                if place_asks and i < nasks:

                    if i > 0:
                        prc = ticksize_ceil( max( asks[ i ], asks[ i - 1 ] + tsz ), tsz )
                    else:
                        prc = asks[ 0 ]
                        
                    qty = round( prc * qtybtc / (con_sz / 1) )
                    if 'ETH' in fut:
                        qty = round( prc * 450 * qtybtc / (con_sz / 1) )    
                    qty = round ( qty / self.buysellsignal)   
                    qty = round (qty * self.multsShort[fut])
                    print('sell')
                    print(fut)
                    print(self.dsrsi)
                    print(qty)  
                    if i < len_ask_ords:
                        oid = ask_ords[ i ][ 'orderId' ]
                        try:
                            self.client.edit( oid, qty, prc )
                        except (SystemExit, KeyboardInterrupt):
                            raise
                        except:
                            try:
                                self.client.sell( fut, qty, prc, 'true' )
                                cancel_oids.append( oid )
                                self.logger.warn( 'Sell Edit failed for %s' % oid )
                            except (SystemExit, KeyboardInterrupt):
                                raise
                            except Exception as e:
                                self.logger.warn( 'Offer order failed: %s at %s'
                                                % ( qty, prc ))

                    else:
                        try:
                            self.client.sell(  fut, qty, prc, 'true' )
                        except (SystemExit, KeyboardInterrupt):
                            raise
                        except Exception as e:
                            self.logger.warn( 'Offer order failed: %s at %s'
                                                % ( qty, prc ))


            if nbids < len( bid_ords ):
                cancel_oids += [ o[ 'orderId' ] for o in bid_ords[ nbids : ]]
            if nasks < len( ask_ords ):
                cancel_oids += [ o[ 'orderId' ] for o in ask_ords[ nasks : ]]
            for oid in cancel_oids:
                try:
                    self.client.cancel( oid )
                except:
                    self.logger.warn( 'Order cancellations failed: %s' % oid )
                                        
    
    def restart( self ):        
        try:
            strMsg = 'RESTARTING'
            print( strMsg )
            self.client.cancelall()
            strMsg += ' '
            for i in range( 0, 5 ):
                strMsg += '.'
                print( strMsg )
                sleep( 1 )
        except:
            pass
        finally:
            os.execv( sys.executable, [ sys.executable ] + sys.argv )        
            

    def run( self ):
        
        self.run_first()
        self.output_status()

        t_ts = t_out = t_loop = t_mtime = datetime.utcnow()

        while True:
            self.get_futures()
            # Directional
            # 0: none
            # 1: StochRSI
            #
            # Price
            # 0: none
            # 1: vwap
            # 2: ppo
            #
            # Volatility
            # 0: none
            # 1: ewma
            with open('deribit-settings.json', 'r') as read_file:
                data = json.load(read_file)
                self.directional = data['directional']
                self.price = data['price']
                self.volatility = data['volatility']

            # Restart if a new contract is listed
            if len( self.futures ) != len( self.futures_prv ):
                self.restart()
            
            self.update_positions()
            
            t_now   = datetime.utcnow()
            
            # Update time series and vols
            if ( t_now - t_ts ).total_seconds() >= WAVELEN_TS:
                t_ts = t_now
                self.update_timeseries()
                self.update_vols()
    
            self.place_orders()
            
            # Display status to terminal
            if self.output:    
                t_now   = datetime.utcnow()
                if ( t_now - t_out ).total_seconds() >= WAVELEN_OUT:
                    self.output_status(); t_out = t_now
            
            # Restart if file change detected
            t_now   = datetime.utcnow()
            if ( t_now - t_mtime ).total_seconds() > WAVELEN_MTIME_CHK:
                t_mtime = t_now
                if getmtime( __file__ ) > self.this_mtime:
                    self.restart()
            
            t_now       = datetime.utcnow()
            looptime    = ( t_now - t_loop ).total_seconds()
            
            # Estimate mean looptime
            w1  = EWMA_WGT_LOOPTIME
            w2  = 1.0 - w1
            t1  = looptime
            t2  = self.mean_looptime
            
            self.mean_looptime = w1 * t1 + w2 * t2
            
            t_loop      = t_now
            sleep_time  = MIN_LOOP_TIME - looptime
            if sleep_time > 0:
                time.sleep( sleep_time )
            if self.monitor:
                time.sleep( WAVELEN_OUT )

            
    def run_first( self ):
        
        self.create_client()
        self.client.cancelall()
        self.logger = get_logger( 'root', LOG_LEVEL )
        # Get all futures contracts
        self.get_futures()
        self.this_mtime = getmtime( __file__ )
        self.symbols    = [ BTC_SYMBOL ] + list( self.futures.keys()); self.symbols.sort()
        self.deltas     = OrderedDict( { s: None for s in self.symbols } )
        
        # Create historical time series data for estimating vol
        ts_keys = self.symbols + [ 'timestamp' ]; ts_keys.sort()
        
        self.ts = [
            OrderedDict( { f: None for f in ts_keys } ) for i in range( NLAGS + 1 )
        ]
        
        self.vols   = OrderedDict( { s: VOL_PRIOR for s in self.symbols } )
        
        self.start_time         = datetime.utcnow()
        self.update_status()
        self.equity_usd_init    = self.equity_usd
        self.equity_btc_init    = self.equity_btc
    
    
    def update_status( self ):
        
        account = self.client.account()
        spot    = self.get_spot()

        self.equity_btc = account[ 'equity' ]
        self.equity_usd = self.equity_btc * spot
                
        self.update_positions()
                
      #  self.deltas = OrderedDict( 
      #      { k: self.positions[ k ][ 'sizeBtc' ] for k in self.futures.keys()}
      #  )
      
      #  self.deltas[ BTC_SYMBOL ] = account[ 'equity' ]        
        
        
    def update_positions( self ):

        self.positions  = OrderedDict( { f: {
            'size':         0,
            'sizeBtc':      0,
            'indexPrice':   None,
            'markPrice':    None
        } for f in self.futures.keys() } )
        positions       = self.client.positions()
        
        for pos in positions:
            if 'ETH' in pos['instrument']:
                pos['size'] = pos['size'] / 10
            if pos[ 'instrument' ] in self.futures:
                self.positions[ pos[ 'instrument' ]] = pos
        
    
    def update_timeseries( self ):
        
        if self.monitor:
            return None
        
        for t in range( NLAGS, 0, -1 ):
            self.ts[ t ]    = cp.deepcopy( self.ts[ t - 1 ] )
        
        spot                    = self.get_spot()
        self.ts[ 0 ][ BTC_SYMBOL ]    = spot
        
        for contract in self.futures.keys():
            ob      = self.client.getorderbook( contract )
            bids    = ob[ 'bids' ]
            asks    = ob[ 'asks' ]
            
            ords        = self.client.getopenorders( contract )
            bid_ords    = [ o for o in ords if o[ 'direction' ] == 'buy'  ]
            ask_ords    = [ o for o in ords if o[ 'direction' ] == 'sell' ]
            best_bid    = None
            best_ask    = None

            err = 10 ** -( self.get_precision( contract ) + 1 )
            
            for b in bids:
                match_qty   = sum( [ 
                    o[ 'quantity' ] for o in bid_ords 
                    if math.fabs( b[ 'price' ] - o[ 'price' ] ) < err
                ] )
                if match_qty < b[ 'quantity' ]:
                    best_bid = b[ 'price' ]
                    break
            
            for a in asks:
                match_qty   = sum( [ 
                    o[ 'quantity' ] for o in ask_ords 
                    if math.fabs( a[ 'price' ] - o[ 'price' ] ) < err
                ] )
                if match_qty < a[ 'quantity' ]:
                    best_ask = a[ 'price' ]
                    break
            bid = best_bid
            ask = best_ask

            if not bid is None and not ask is None:
                mid = 0.5 * ( bid + ask )
                
            else:
                continue
            self.ts[ 0 ][ contract ]               = mid
                
        self.ts[ 0 ][ 'timestamp' ]  = datetime.utcnow()

        
    def update_vols( self ):
        
        if self.monitor:
            return None
        
        w   = EWMA_WGT_COV
        ts  = self.ts
        
        t   = [ ts[ i ][ 'timestamp' ] for i in range( NLAGS + 1 ) ]
        p   = { c: None for c in self.vols.keys() }
        for c in ts[ 0 ].keys():
            p[ c ] = [ ts[ i ][ c ] for i in range( NLAGS + 1 ) ]
            
        if any( x is None for x in t ):
            return None
        for c in self.vols.keys():
            if any( x is None for x in p[ c ] ):
                return None
        
        NSECS   = SECONDS_IN_YEAR
        cov_cap = COV_RETURN_CAP / NSECS
        
        for s in self.vols.keys():
            
            x   = p[ s ]            
            print(x)
            dx  = x[ 0 ] / x[ 1 ] - 1
            print(dx)
            dt  = ( t[ 0 ] - t[ 1 ] ).total_seconds()
            v   = min( dx ** 2 / dt, cov_cap ) * NSECS
            v   = w * v + ( 1 - w ) * self.vols[ s ] ** 2
            self.vols[ s ] = math.sqrt( v )
                            

if __name__ == '__main__':
    
    try:
        mmbot = MarketMaker( monitor = args.monitor, output = args.output )
        mmbot.run()
    except( KeyboardInterrupt, SystemExit ):
        print( "Cancelling open orders" )
        mmbot.client.cancelall()
        sys.exit()
    except:
        print( traceback.format_exc())
        if args.restart:
            mmbot.restart()
        