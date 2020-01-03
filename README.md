# Crypto Growth Hacker Crowdfunded Bot Tokens to Mint - Option 1, Self-Run Bot

## Todo

1. Integrate more directional/price/volume indicators from https://github.com/peerchemist/finta
2. Enable Eth. This involves a. allowing more instruments on get_futures and b. adding an eth_long_straddles.py file that mirrors the BTC behavior. Of these, a is easier and has already been done before.
3. Add a delta chart for you folks to run, like this: https://i.imgur.com/G2ONhhE.png

## Changelog

0.1. Initial commit

0.11. Changed vwap and stochrsi to load prices from contract at hand rather than forcing btc-perpetual. These indicators on other contracts now behave better.

## Eth

Contact me to enable eth. It'll take some re-writing.

## Settings

### Directional
0: none

1: StochRSI

### Price

0: none

1: vwap

### Volatility
0: none

1: ewma

## long_straddles.py


Run your Deribit.py and see how big of orders it makes on BTC pairs. Then, adjust the top lines of long_straddles to match.


Why long straddles? https://dunncreativess.github.io/2019/11/22/risk-free-futures-market-making-by-hedging-long-straddle-options/

## Reasoning

I'm offering my market maker bot one of two possible ways: 1. I provide you the source code and you can configure your apikey and secret and review the code to make sure nothing malicious happens, on a profit-share scheme where you provide 40% of the earnings after every month - as confirmed by API. 2. I'm creating a dividend token for sale to the general public (including Americans) that I then pay monthly 70% of the profit (10% for me, 15% reinvested for compounding effect, 5% BNB holdings). The dividend trading fund would span multiple bots, with an initial spread of 25% Neomenia BTC 25% Neomenia ETH 25% Deribit arb + options BTC 25% Eth. The dividend token script I'm using doesn't have voting, but we'll vote on bot % holdings and bot strategies using an off-chain voting system enabled by etherscan reports on holding %, anything more than 5% gets a vote.


The benefits of option 1 is that you get to run one of my bots with a profit-share model, the benefits of option 2 are: a. if you're an American citizen you can now kindof take part in leveraged futures trading, by way of the token. b. as our BNB accumulates, we pay less fees c. as our BNB accumulates, we get more % from our referrals d. the combined notional traded on Binance will allow us to further climb their fee ladder. You can also refer people to the crowdfunded bot, for every 100 tokens at $1 worth of Eth apiece minted you get 10 tokens. For every 100 tokens that a referral of your referral mints you get 5 tokens.


https://i.imgur.com/PBQZAB1.png


1. Join Telegram https://t.me/ManyVolumeSignalMonster
2. Fill out this form.
3. Send your Eth here: 0x9c33b574c8D013Ba501a897484E3b92a27A3FDB8
4. Fill the TXID in this form.
5. Tokens will be minted as often as possible, with the least often being once a month before dividends are paid.


Form to fill: https://forms.gle/bDQmuUhQQ5FJPvgN6


NOTE: This is essentially gambling I won't run off with the crowdfunded $. It's also gambling that if I don't, the bots might fail tragically. If you have an issue contributing, simply take the offer of profitshare bot that you have sourcecode for! RISK ONLY WHAT YOU CAN AFFORD TO LOSE. Previous historical performance is IN NO WAY an implication or assurance of future performance.


Tokenshares: https://docs.google.com/spreadsheets/d/1hsI_IIXsbq1LWM9lQIiWzSjbn6xz5TuGMmkr5k2fE0U/edit?usp=sharing

## Notes from Original Dev

The one that should not be changed unless you substantially change the variance estimation logic is NLAGS. NLAGS = 2 just means that at each point, for each instrument, the bot just remembers the current and previous 2 (NLAGS) timeseries values (price, timestamp, etc). Because the variance estimation is an EWMA, once you've defined a prior then all you need at each update is the current estimate and the 2 most recent time stamp values. This should correspond to NLAGS = 1, but NLAGS = 2 is useful if you also want to incorporate a similar estimation for autocorrelations.



COV in COV_RETURN_CAP is just short for covariance. In this case it only applies to variance estimation because this bot does not bother to calculate all the covariances, but the code could be expanded to do that. The basic reason it's there is basically to make sure your variance estimate does not blow up due to a bad print (data). It can be set to any value that will tend to mitigate the effect of bad prints but not so low that it's messing with the estimate for good prints. In practice this has an effect very infrequently. Still you don't want to have your vol estimate jump to like 10,000% due to a bad print.



DECAY_POS_LIM is just a parameter that defines how quickly your position limit decays or goes to 0 towards expiry. I think the units are in days so if I remember the formula right a value of 0.1 corresponds to a position limit of about 50% the total defined limit when at 7 days before expiry. (1 - exp( -0.1 * 7 ).) Setting it to a substantially larger value will approximate no decay.
EWMA_WGT_COV is just how much weight is put on the most recent observation for updating the variance estimate. So if this value is w then the variance is updated as something like var = w * return^2 + ( 1 - w ) * var. The higher the value the "faster" the estimator updates, but if you set it all the way to 100% then the estimator basically becomes trivial and very noisy since it's simply the most recent squared return.



EWMA_WGT_LOOPTIME is just another update parameter, similar to the previous, but in this case for estimating the average looptime (how long it takes the bot to execute one full update loop). It has no effect on volatility estimation.

FORECAST_RETURN_CAP I believe is not even used and was accidentally left in there.



RISK_CHARGE_VOL can be set to any non-zero value in principle, though too large a value will probably throw errors. It directly affects the width of the spread.



VOL_PRIOR is just the "starting point" for the vol EWMA estimator. There's almost certainly better ways to define a prior, but the influence of the prior on the estimate decays exponentially as it updates, so it's not necessarily super important.



Note that this bot is just an example and can conceivably be improved upon in numerous ways. In fact it looks like there's still an outstanding pull request I made to address the fact the bot does not handle the ETH contracts correctly (it was made when there were only BTC contracts).
