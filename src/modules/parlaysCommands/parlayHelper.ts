import axios from 'axios';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import { getBot } from '../../botInit';
import { config } from '../../config';
import { parlayAmm } from '../../infrastructure/abis/ParlayAmm';
import { Logger } from '../../infrastructure/logger';
import { Redis } from '../../infrastructure/redis';
import { provider } from '../../sevices/arbitrum-provider';
import { getUsdcAmountForAddress } from '../../sevices/chain-utils';
import { currencyFormatter } from '../../sevices/curency';
import {
  addDefaultFeeToUser,
  addParlayFeeToUser,
  getUserAddress,
  getUserWallet,
} from '../../sevices/userApi';
import {
  ParlaysState,
  clearParlay,
  clearParlaysBetStates,
  parlaysBetData,
  parlaysBetState,
} from './parlaysState';

const log = new Logger('Parlays');

export const handleParlays = async (chatId: number) => {
  const bot = getBot();
  try {
    const walletBalance = await getUserWallet(chatId, log);

    const options = [
      [
        {
          text: '📝 Review Parlay Draft ',
          callback_data: 'parlays:draft',
        },
      ],
      [
        {
          text: '📤 Duplicate Parlay ',
          callback_data: 'parlays:duplicate',
        },
      ],
      [
        {
          text: '🔄 Reset Parlay Draft ',
          callback_data: 'parlays:reset',
        },
      ],
    ];

    const message = `
    💰 Wallet balance: ${currencyFormatter(walletBalance.usdcAmount)}

  <b>🛠️ Parlay Options:</b>

  Here are some handy options to manage your parlay draft:

  📝 Review Parlay Draft: View your current parlay draft and make any necessary adjustments before finalizing it.

  📋 Duplicate Parlay: Want to try someone else's winning strategy? Enter their ticket ID to duplicate their parlay.

  🔄 Reset Parlay Draft: Start fresh by resetting your current parlay draft. This is useful if you want to explore new betting combinations.

  `;

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: options,
      },
      parse_mode: 'HTML',
    });
  } catch (error: any) {
    log.error(`Error on /parlays command ${error.message}`);
    await bot.sendMessage(chatId, 'Unable to parse parlays,  go to /start');
  }
};

export const handleDraftParlays = async (chatId: number) => {
  const bot = getBot();
  try {
    const walletBalance = await getUserWallet(chatId, log);
    const redisKey = `${config.redis.prefix.userParlay}${chatId}`;

    const parlayDraftExists = await Redis.exists(redisKey);

    if (!parlayDraftExists) {
      await bot.sendMessage(
        chatId,
        `
      There no games added to the draft

      Explore <b> 🏆 Leagues </b> and add games to your parlay draft

        `,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏆 LEAGUES', callback_data: '/leagues' }],
            ],
          },
          parse_mode: 'HTML',
        }
      );
      return;
    }

    const draft = await Redis.getJSON(redisKey);

    const positionsList = draft
      .map((position: any) => {
        let typeInfo = `🃏 Type: ${position.type}`;
        let betInfo =
          position.type !== 'Total' ? `🏆 You bet on: ${position.teamBet}` : ''; // Exclude the 'You bet on' line for 'Total'

        if (position.type === 'Total') {
          typeInfo += ` ${position.side} (${position.total})`; // Include side and total for 'Total'
        }
        if (position.type === 'Handicap') {
          typeInfo += ` (${position.spread})`;
        }

        // Initialize with the Match line
        let result = `\n 🎮 Match: ${position.details}`;

        // Append the 'You bet on' line if it's applicable
        if (betInfo) {
          result += `\n  ${betInfo}`;
        }

        // Append other common lines
        result += `\n  ${typeInfo}`;
        result += `\n  🎲 Odds: ${position.odds}`;
        result += `\n  📅 Starts in: ${position.startTime}`;

        return result;
      })
      .join('\n');

    const totalOdds = draft.reduce(
      (accumulator: any, position: any) => accumulator * position.odds,
      1
    );

    const totalOddsWithTwoDecimals = totalOdds.toFixed(2);

    const message = `
    🔥 Here are your parlay positions so far 🔥
    ${positionsList}

    ════ <b>Total Odds</b> ═══
    ❗The potential payout will change based on the bet amount, fees and  skew

    🎲 Total Odds: ${totalOddsWithTwoDecimals}

    ════ <b>Next steps </b> ═══
    You can either place your parlay bet

    Explore <b> 🏆 Leagues </b> and add more games to your parlay draft

    Or use the buttons to remove games from your parlay and see new total odds

    `;

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎫 PLACE BET',
              callback_data: 'parlays:startBet',
            },
          ],
          [
            {
              text: '🏆 LEAGUES',
              callback_data: '/leagues',
            },
            {
              text: '🎫 PARLAYS',
              callback_data: '/parlays',
            },
          ],
        ],
      },
      parse_mode: 'HTML',
    });
  } catch (error: any) {
    log.error(`Error on parlays:draft command ${error.message}`);
    await bot.sendMessage(chatId, 'Unable to parse parlay draft, go to /start');
  }
};

export const handleResetParlays = async (chatId: number) => {
  const bot = getBot();
  try {
    const redisKey = `${config.redis.prefix.userParlay}${chatId}`;
    const parlayDraftExists = await Redis.exists(redisKey);

    if (!parlayDraftExists) {
      await bot.sendMessage(
        chatId,
        `
      There no games added to the draft

      Explore <b> 🏆 Leagues </b> and add games to your parlay draft

        `,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏆 LEAGUES', callback_data: '/leagues' }],
            ],
          },
          parse_mode: 'HTML',
        }
      );
      return;
    }

    await Redis.del(redisKey);

    const message = `
    🔄 Parlay Draft Reset!

Your parlay draft has been successfully reset. 🛠️ If you're ready to start over with a fresh slate, head over to the <b>Leagues</b> tab to build your new parlay from scratch.
 Or, if you're feeling lucky, you can also visit the <b>Parlays</b> tab to copy someone else's winning parlay and try your luck!

Remember, every parlay is a chance to win big. Enjoy the excitement and have fun exploring your options! 🎉🎮
    `;

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🏆 LEAGUES',
              callback_data: '/leagues',
            },
          ],
          [
            {
              text: '🏆 PARLAYS',
              callback_data: '/parlays',
            },
          ],
        ],
      },
      parse_mode: 'HTML',
    });
  } catch (error: any) {
    log.error(`Error on parlays:draft command ${error.message}`);
    await bot.sendMessage(chatId, 'Unable to parse parlay draft, go to /start');
  }
};

export const handleStartParlayBet = async (chatId: number) => {
  const bot = getBot();
  try {
    const walletBalance = await getUserWallet(chatId, log);

    const buttons = [
      {
        text: '$5',
        callback_data: '5',
      },
      {
        text: '$10',
        callback_data: '10',
      },
      {
        text: '$20',
        callback_data: '20',
      },
      {
        text: '$50',
        callback_data: '50',
      },
      {
        text: '$100',
        callback_data: '100',
      },
      {
        text: '$200',
        callback_data: '200',
      },
    ];

    parlaysBetState[chatId] = ParlaysState.AWAITING_AMOUNT;

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: ${currencyFormatter(
        walletBalance.usdcAmount
      )} \n \n Enter bet amount or select a value \n Keep in mind there is a <b>minimum of $5 bet</b> on parlays \n`,
      {
        reply_markup: {
          inline_keyboard: [buttons],
        },
        parse_mode: 'HTML',
      }
    );
  } catch (error: any) {
    await clearParlaysBetStates(chatId);
    log.error(`Error on processing parlays:startBet command ${error.message}`);
    await bot.sendMessage(chatId, 'Unable process parley bet, go to /start');
  }
};

export const showParlayConfirmation = async (
  chatId: number,
  data: any,
  userUsdcAmount: string
) => {
  const bot = getBot();

  const redisKey = `${config.redis.prefix.userParlay}${chatId}`;
  const parlayDraftExists = await Redis.exists(redisKey);

  if (!parlayDraftExists) {
    await bot.sendMessage(
      chatId,
      `
      🚫 Error, try again or contact support
      There no games added to the draft

      Explore <b> 🏆 Leagues </b> and add games to your parlay draft

        `,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏆 LEAGUES', callback_data: '/leagues' }],
          ],
        },
        parse_mode: 'HTML',
      }
    );
    clearParlaysBetStates(chatId);
    return;
  }

  const draft = await Redis.getJSON(redisKey);

  const contractsArray = draft.map((item: any) => item.contract);
  const betPositionArray = draft.map((item: any) => item.betPosition);

  const parlayAmmContract = new ethers.Contract(
    config.arbitrum.parlayAmmAddress,
    parlayAmm.abi,
    provider
  );

  const betAmountBn = new BigNumber(data.betAmount).multipliedBy(1e6);
  let expectedPayout;
  try {
    expectedPayout = await parlayAmmContract.buyQuoteFromParlay(
      contractsArray,
      betPositionArray,
      betAmountBn.toString()
    );
  } catch (error: any) {
    log.error(`error buyQuoteFromParlay ${error.message}`);
    throw new Error(
      'Critical error getting quotes. Please try again or contact support'
    );
  }

  const savedBuyAmount = expectedPayout.totalBuyAmount.toString();
  parlaysBetData[chatId].expectedPayout = savedBuyAmount;

  const totalBuyAmount = new BigNumber(expectedPayout.totalBuyAmount.toString())
    .dividedBy(1e18)
    .decimalPlaces(2, BigNumber.ROUND_DOWN);

  await bot.sendMessage(
    chatId,
    `💰 Wallet balance: ${currencyFormatter(userUsdcAmount)} \n

    Parlays have additional fees that the provider require. These are explained below.

    ════ <b>Important info</b> ═══
      Sports Provider Parlay fees:
      💸 PARLAY Fee: 3.00 %
      💸 SAFEBOX Fee: 2.00 %

    ═══ <b> Bet details </b> ═══
      Bet Amount: $${data.betAmount}
      Potential Payout: $${totalBuyAmount.toString()}
      Network And Processing Fee: $3
    `,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '⤴️ PLACE BET',
              callback_data: 'parlays:bet:confirm',
            },
            {
              text: '🏁 START OVER',
              callback_data: '/parlays',
            },
          ],
        ],
      },
      parse_mode: 'HTML',
    }
  );
};

export const handleConfirmParlay = async (chatId: number) => {
  const bot = getBot();

  try {
    const redisKey = `${config.redis.prefix.userParlay}${chatId}`;
    const parlayDraftExists = await Redis.exists(redisKey);

    if (!parlayDraftExists) {
      await bot.sendMessage(
        chatId,
        `
      🚫 Error, try again or contact support
      There no games added to the draft

      Explore <b> 🏆 Leagues </b> and add games to your parlay draft

        `,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🏆 LEAGUES', callback_data: '/leagues' }],
            ],
          },
          parse_mode: 'HTML',
        }
      );
      clearParlaysBetStates(chatId);
      return;
    }

    const draft = await Redis.getJSON(redisKey);

    const betData = parlaysBetData[chatId];

    if (betData === undefined) {
      throw new Error(`Error while placing bet`);
    }

    const userAddress = await getUserAddress(chatId, log);

    const userAmount = await getUsdcAmountForAddress(userAddress);
    const userAmountBn = new BigNumber(userAmount);

    const betAmountbn = new BigNumber(betData.betAmount);
    const totalUserExpense = betAmountbn.plus(config.fees.defaultFee);

    if (userAmountBn.lt(totalUserExpense)) {
      throw new Error(`🚫 Bet Placement Failed 🚫

      Unfortunately, your account does not have sufficient funds to place this bet. Please ensure that you have enough balance to cover both the bet amount and the associated network and processing fees.

      If you have any questions or need further assistance, please don't hesitate to reach out.
      `);
    }

    await bot.sendMessage(
      chatId,
      `Your bet is being processed. Please have a little patience. 👍`
    );

    const url = `${config.api.url}/user/parlays/place-bet`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;

    const res = await axios({
      method: 'post',
      url,
      data: {
        userAddress,
        parlayInfo: JSON.stringify(draft),
        betAmount: betData.betAmount,
        expectedPayout: betData.expectedPayout,
      },
      headers: { [privateHeader]: privateKey },
    });

    if (res.data.status === 'fail') {
      log.error(`Error while placing bet ${res.data.error}`);
      throw new Error('Failed to place bet. Try again or contact support.');
    }

    await bot.sendMessage(
      chatId,
      `
      🎉 Congratulations! Your bet has been successfully placed. 🎉

      🔍 To check your bet details, use the * Parlays Positions *  tab.
      💰 When you're ready to claim your winnings, head over to the * Parlays Winnings * tab!
      🏆 Feeling lucky? Place more bets in the *Leagues* tab!

      Best of luck! 🍀

      `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📋 POSITIONS',
                callback_data: '/positions',
              },
              {
                text: '💸 WINNINGS',
                callback_data: '/winnings',
              },
              {
                text: '🏆 LEAGUES',
                callback_data: '/leagues',
              },
            ],
          ],
        },
        parse_mode: 'Markdown',
      }
    );

    await addParlayFeeToUser(userAddress);
    await clearParlay(chatId);
  } catch (error: any) {
    clearParlaysBetStates(chatId);
    const buttons = [
      {
        text: '🏁 START OVER',
        callback_data: '/parlays',
      },
    ];
    const errMsg = `❌ ${error.message}`;
    await bot.sendMessage(chatId, errMsg, {
      reply_markup: {
        inline_keyboard: [buttons],
      },
      parse_mode: 'HTML',
    });
  }
};

export const handleParlayPositions = async (chatId: number) => {
  const bot = getBot();

  try {
    const address = await getUserAddress(chatId, log);

    const url = `${config.api.url}/user/parlays/open-positions`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;

    const res = await axios({
      method: 'post',
      url,
      data: {
        address,
      },
      headers: { [privateHeader]: privateKey },
    });

    const openPositions = res.data;

    const parlayPositions = openPositions.parlayPositions
      .map((parlay: any) => {
        const positionsList = parlay.positions
          .map((position: any) => {
            let typeInfo = `🃏 Type: ${position.type}`;
            let betInfo = `🏆 Your Bet: ${position.betOnTeam}`;

            if (position.type === 'Total') {
              const total = new BigNumber(position.total)
                .dividedBy(100)
                .decimalPlaces(2);
              betInfo = `🏆 Your Bet: ${position.betOnTeam} (${total})`; // Include side and total for 'Total'
            }

            if (position.type === 'Handicap') {
              const spread = new BigNumber(position.spread)
                .dividedBy(100)
                .decimalPlaces(2);
              betInfo = `🏆 Your Bet: ${position.betOnTeam} (${spread})`;
            }

            return `
      🎮 ${position.details}
      ${typeInfo}
      ${betInfo}
      ⏰ Maturity: ${position.maturity}`;
          })
          .join('\n');

        return `
    💸 Bet Amount: ${parlay.betAmount} USDC
    💰 Potential Payout: ${parlay.positionSize} USDC
    ⏰ Last Game Starts: ${parlay.lastGameStarts}
    Positions:
    ${positionsList}
      `;
      })
      .join('\n');

    const message = `
      🔥 Here are your open parlays 🔥
      ${parlayPositions}
      Once positions finalize, check your results in the 🏆 Winnings tab.
      🚀 Feeling more adventurous? Dive into the 🏟 Leagues tab and place more bets!
      `;

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '💸 WINNINGS',
              callback_data: '/winnings',
            },
            {
              text: '🏆 LEAGUES',
              callback_data: '/leagues',
            },
          ],
        ],
      },
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    log.error(
      `Error while calling show open parlay positions ${error.message}`
    );
    await bot.sendMessage(
      chatId,
      'Unable process open parlay positions, try again later or contact support'
    );
  }
};

export const handleParlayWinnings = async (chatId: number) => {
  const bot = getBot();

  try {
    const address = await getUserAddress(chatId, log);
    const url = `${config.api.url}/user/parlays/winning-positions`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;

    const res = await axios({
      method: 'post',
      url,
      data: {
        address,
      },
      headers: { [privateHeader]: privateKey },
    });

    const winningPositions = res.data.parlayPositions;

    await bot.sendMessage(
      chatId,
      `
      "🎉 Congratulations on your winning positions! 🎉
To claim your rewards, simply press the 'Claim' button. Please remember, any winnings left unclaimed for more than 90 days will be automatically forfeited. Claim now and enjoy your rewards! 🚀"
      `
    );

    if (winningPositions.length === 0) {
      await bot.sendMessage(
        chatId,
        `
        🏆 No winning positions this time, but remember, every bet is a step towards potential success. Keep on playing and stay positive – your next win could be just around the corner! 🌟🎮
        `
      );
    }

    const markets = winningPositions.map(async (market: any) => {
      const address = market.marketId;
      const amount = market.positionSize;
      const details = market.details;

      const message = `🎉 Congrats on your bet: 🥳 \n You've bagged * $${amount} *. \n Hit the button below to claim your winnings now! 💰`;

      const button = [
        {
          text: `Claim`,
          callback_data: `claimParlays:${address}`,
        },
      ];

      await bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: [button],
        },
        parse_mode: 'Markdown',
        disable_notification: true,
      });
    });

    await Promise.all(markets);
  } catch (error: any) {
    log.error(
      `Error while calling show top claimable positions ${error.message}`
    );
    await bot.sendMessage(
      chatId,
      'Unable process winning positions, try again later or contact support'
    );
  }
};

export const handleClaimParlays = async (
  chatId: number,
  data: string,
  log: Logger
) => {
  const bot = getBot();
  const claimAddress = data.replace('claimParlays:', '');
  try {
    const address = await getUserAddress(chatId, log);

    const url = `${config.api.url}/user/parlays/claim`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;

    const res = await axios({
      method: 'post',
      url,
      data: {
        address,
        id: claimAddress,
      },
      headers: { [privateHeader]: privateKey },
    });

    await bot.sendMessage(
      chatId,
      `
      🚀 Awesome! You've successfully claimed your winnings! 💰

      What's next? Dive back in and amplify your gains!
      - Check out more matches in the * Leagues * tab 🔍
      - Monitor your open bets in the * Positions * tab 📈
      - Revisit the * Winnings * tab to ensure you haven't missed any unclaimed prizes 🏆

      Stay sharp and keep betting! 🎲

      `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💸 WINNINGS',
                callback_data: '/winnings',
              },
              {
                text: '📋 POSITIONS',
                callback_data: '/positions',
              },
              {
                text: '🏆 LEAGUES',
                callback_data: '/leagues',
              },
            ],
          ],
        },
        parse_mode: 'Markdown',
      }
    );
    await addDefaultFeeToUser(address);
  } catch (error: any) {
    log.error(`Error while calling show claim position ${error.message}`);
    await bot.sendMessage(
      chatId,
      'Unable process winning positions, try again later or contact support'
    );
  }
};
