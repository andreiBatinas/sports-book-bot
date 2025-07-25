import axios from 'axios';
import BigNumber from 'bignumber.js';
import TelegramBot from 'node-telegram-bot-api';

import { getBot } from '../../botInit';
import { config } from '../../config';
import { Logger } from '../../infrastructure/logger';
import { Redis } from '../../infrastructure/redis';
import { getUsdcAmountForAddress } from '../../sevices/chain-utils';
import { currencyFormatter } from '../../sevices/curency';
import { addOrUpdatePosition } from '../../sevices/parlay-utils';
import {
  addDefaultFeeToUser,
  getUserAddress,
  getUserWallet,
} from '../../sevices/userApi';
import { toDecimalOdds } from '../../utils/odds';
import { ParlayPosition } from '../parlaysCommands/parlay.types';
import {
  GOLF_TOURNAMENT_WINNER,
  LEAGUE_KEYS,
  LEAGUE_TITLES,
  SOCCER,
  TAGS_OF_MARKETS_WITHOUT_DRAW_ODDS,
} from './league.types';
import {
  LeagueBetState,
  clearLeagueBetStates,
  leagueBetData,
  leagueBetState,
} from './leagueState';

export const leaguesInfo = async (chatId: number, log: Logger) => {
  const bot = getBot();
  try {
    const walletBalance = await getUserWallet(chatId, log);

    const leagues = [
      [
        {
          text: '⚽ Champions League Qualification',
          callback_data: 'leagues:Champions League Qualification',
        },
      ],
      [
        {
          text: '⚽ Copa Libertadores 🌎',
          callback_data: 'leagues:Copa Libertadores',
        },
      ],
      [
        {
          text: '⚽ Europa Conference League',
          callback_data: 'leagues:Europa Conference League',
        },
      ],
      [
        {
          text: '⚽ English Premier League',
          callback_data: 'leagues:EPL',
        },
      ],
      [
        {
          text: '⚽ La Liga',
          callback_data: 'leagues:La Liga',
        },
      ],
      [
        {
          text: '⚽ France League 1',
          callback_data: 'leagues:France League 1',
        },
      ],
      [
        {
          text: '⚽ Netherlands League 1',
          callback_data: 'leagues:Netherlands League 1',
        },
      ],
      [
        {
          text: '⚽ Portugal League 1',
          callback_data: 'leagues:Portugal League 1',
        },
      ],
      [
        {
          text: '⚽ World Cup Woman 👩',
          callback_data: 'leagues:World Cup Woman',
        },
      ],
      [
        {
          text: '⚽ UEFA EURO Qualifiers',
          callback_data: 'leagues:EURO Qualification',
        },
      ],
      [
        {
          text: '🇯🇵 Japan J1 ⚽️',
          callback_data: 'leagues:J1',
        },
      ],
      [
        {
          text: '🇩🇪 Bundesliga ⚽️',
          callback_data: 'leagues:Bundesliga',
        },
      ],
      [
        {
          text: '🇺🇸 MLS ⚽️',
          callback_data: 'leagues:MLS',
        },
      ],
      [
        {
          text: '🇸🇦 Saudi Professional League ⚽️',
          callback_data: 'leagues:Saudi Professional League',
        },
      ],
      [
        {
          text: '⚾️ Baseball MLB',
          callback_data: 'leagues:MLB',
        },
      ],

      [
        {
          text: '🏀 FIBA',
          callback_data: 'leagues:409',
        },
        {
          text: '🏀 NBA',
          callback_data: 'leagues:NBA',
        },
      ],
      [
        {
          text: '🏀 EUROLEAGUE',
          callback_data: 'leagues:EuroLeague',
        },
      ],

      [
        {
          text: '🏈 NFL',
          callback_data: 'leagues:NFL',
        },
        {
          text: '🏈 NCAA ',
          callback_data: 'leagues:NCAAF',
        },
      ],
      [
        {
          text: '🏒 HOCKEY NHL',
          callback_data: 'leagues:NHL',
        },
      ],
      [
        {
          text: '🎮 League of Legends',
          callback_data: 'leagues:LOL',
        },
      ],
      [
        {
          text: '🔫 CS:GO',
          callback_data: 'leagues:CsGo',
        },
        {
          text: '🛡️ Dota',
          callback_data: 'leagues:dota',
        },
      ],
      [
        {
          text: '🥊 UFC',
          callback_data: 'leagues:UFC',
        },
        {
          text: '🥊 Boxing',
          callback_data: 'leagues:Boxing',
        },
      ],
      [
        {
          text: '🎾 Tennis Masters',
          callback_data: 'leagues:Tennis Masters 1000',
        },
        {
          text: '🎾 Tennis Grand Slam',
          callback_data: 'leagues:Tennis GS',
        },
      ],

      [
        {
          text: '🏌️‍♂️ GOLF Winners',
          callback_data: 'leagues:GOLF Winners',
        },
        {
          text: '🏌️‍♂️ GOLF H2H',
          callback_data: 'leagues:GOLF H2H',
        },
      ],
    ];

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: ${currencyFormatter(
        walletBalance.usdcAmount
      )} \n \n Select which League you'd like to markets on:`
    );

    await bot.sendMessage(chatId, '🏆 <b>Leagues</b>', {
      reply_markup: {
        inline_keyboard: leagues,
      },
      parse_mode: 'HTML',
      disable_notification: true,
    });
  } catch (error: any) {
    log.error(`Error on /leagues command ${error.message}`);
    await bot.sendMessage(
      chatId,
      'Unable to fetch the leagues details, go to /start'
    );
  }
};

export const showLeagueMarkets = async (
  chatId: number,
  log: Logger,
  leagueKey: string
) => {
  const bot = getBot();
  try {
    const walletBalance = await getUserWallet(chatId, log);

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: ${currencyFormatter(
        walletBalance.usdcAmount
      )} \n \n Select which Market and odds you'd like to bet on:`
    );
    const redisKey = `${config.redis.prefix.sportsBetsPrefix}${leagueKey}`;

    const marketExists = await Redis.exists(redisKey);

    if (!marketExists) {
      await bot.sendMessage(
        chatId,
        'There no markets available to bet on right now'
      );
      return;
    }

    const data = await Redis.getJSON(redisKey);
    let title = leagueKey;

    const titleString = LEAGUE_TITLES[leagueKey];

    const reducedLeagueKey = LEAGUE_KEYS[leagueKey];

    if (reducedLeagueKey === undefined) {
      log.error(`Error on /leagues ${leagueKey} command, bad league keys`);
      await bot.sendMessage(
        chatId,
        'Unable to fetch the league details, go to /start or contact support.'
      );
      return;
    }

    if (titleString) {
      title = titleString;
    }
    const marketButtons = [];

    const userAddress = walletBalance.address;

    const now = new Date();

    const filteredAndSortedArr = data
      // Filter out objects with a start time that is in the past
      .filter((market: any) => {
        const startTime = new Date(market.startTime);
        return startTime >= now;
      })
      // Sort the remaining objects in descending order by start time
      .sort((a: any, b: any) => {
        const dateA = new Date(a.startTime);
        const dateB = new Date(b.startTime);
        return dateB.getTime() - dateA.getTime();
      });

    if (filteredAndSortedArr.length === 0) {
      await bot.sendMessage(
        chatId,
        'There no markets currently available for this league.'
      );
      return;
    }

    for await (const market of filteredAndSortedArr) {
      const startTime = new Date(market.startTime);

      const diffInMilliseconds = startTime.getTime() - now.getTime();

      const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
      const diffInHours = Math.floor(
        (diffInMilliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const diffInMinutes = Math.floor(
        (diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60)
      );

      let timeMessage = '';

      if (diffInDays > 0) {
        timeMessage += `${diffInDays} days, `;
      }
      if (diffInDays > 0 || diffInHours > 0) {
        timeMessage += `${diffInHours} hours, `;
      }
      timeMessage += `${diffInMinutes} minutes `;

      const details = market.details;
      const homeTeam = market.homeTeam;
      const awayTeam = market.awayTeam;
      const normalDecimalOdds = market.odds.decimalOddsArray;

      const globalId = await Redis.getGlobalId();

      let parleyBaseKey = `${config.redis.prefix.parlayChoicePrefix}${config.redis.prefix.marketBetPrefix}${chatId}:${globalId}`;

      let baseKey = `${config.redis.prefix.marketBetPrefix}${chatId}:${globalId}`;

      const tag: number = parseInt(market.tags[0], 10);

      const isSingleMarket = GOLF_TOURNAMENT_WINNER.find(
        (singleTag) => singleTag === tag
      );
      const isTwoMarket = TAGS_OF_MARKETS_WITHOUT_DRAW_ODDS.find(
        (noDrawTag) => noDrawTag === tag
      );

      const isThreeMArket = SOCCER.find((soccer) => soccer === tag);

      const message = `═══ * ${title} * ═══ \n 🔥 ${details} 🔥 \n 🕒 Starts at : ${market.startTime} \n 🕒 Starts in : ${timeMessage}`;

      if (isSingleMarket) {
        await showSingleMarket(
          chatId,
          message,
          parleyBaseKey,
          baseKey,
          market,
          homeTeam,
          awayTeam,
          normalDecimalOdds,
          log
        );
      } else if (isTwoMarket) {
        await showTwoMarkets(
          chatId,
          message,
          parleyBaseKey,
          baseKey,
          market,
          homeTeam,
          awayTeam,
          normalDecimalOdds,
          log
        );
      } else if (isThreeMArket) {
        await showTrippleMarkets(
          chatId,
          message,
          parleyBaseKey,
          baseKey,
          market,
          homeTeam,
          awayTeam,
          normalDecimalOdds,
          log
        );
      }
    }
  } catch (error: any) {
    log.error(`Error on /leagues ${leagueKey} command ${error.message}`);
    await bot.sendMessage(
      chatId,
      'Unable to fetch the league details, go to /start'
    );
  }
};

const showSingleMarket = async (
  chatId: number,
  message: string,
  parleyBaseKey: string,
  baseKey: string,
  market: any,
  homeTeam: string,
  awayTeam: string,
  normalDecimalOdds: number[],
  log: Logger
) => {
  const bot = getBot();

  const redisKey0 = `${baseKey}:0`;

  const buttonKey0 = `${parleyBaseKey}:0`;

  const odd0 = market.odds.decimalOddsArray[0];

  if (odd0 === 0) {
    return null;
  }

  await Redis.setJSON(redisKey0, {
    parentAddress: market.address,
    address: market.address,
    startTime: market.startTime,
    details: market.details,
    oddUsed: odd0,
    type: 'Winner',
    betPosition: 0,
    teamBet: homeTeam,
  });

  const spreadMarkets = market.children.filter(
    (child: any) => child.spread !== null
  );

  const totalMarkets = market.children.filter(
    (child: any) => child.total !== null
  );

  const buttons = [
    [
      {
        text: `═══ WINNER ═══`,
        callback_data: `0`,
      },
    ],
    [
      {
        text: `🎲 ${homeTeam} ${normalDecimalOdds[0]} Odds`,
        callback_data: buttonKey0,
      },
    ],
  ];

  await addSpreadData(market, baseKey, parleyBaseKey, spreadMarkets, buttons);
  await addTotaldata(market, baseKey, parleyBaseKey, totalMarkets, buttons);

  await bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: buttons,
    },
    parse_mode: 'Markdown',
    disable_notification: true,
  });
};

const showTwoMarkets = async (
  chatId: number,
  message: string,
  parleyBaseKey: string,
  baseKey: string,
  market: any,
  homeTeam: string,
  awayTeam: string,
  normalDecimalOdds: number[],
  log: Logger
) => {
  const bot = getBot();

  const redisKey0 = `${baseKey}:0`;
  const redisKey1 = `${baseKey}:1`;

  const buttonKey0 = `${parleyBaseKey}:0`;
  const buttonKey1 = `${parleyBaseKey}:1`;

  const odd0 = market.odds.decimalOddsArray[0];
  const odd1 = market.odds.decimalOddsArray[1];

  if (odd0 === 0 && odd1 === 0) {
    return null;
  }

  await Redis.setJSON(redisKey0, {
    parentAddress: market.address,
    address: market.address,
    startTime: market.startTime,
    details: market.details,
    oddUsed: odd0,
    type: 'Winner',
    betPosition: 0,
    teamBet: homeTeam,
  });
  await Redis.setJSON(redisKey1, {
    parentAddress: market.address,
    address: market.address,
    startTime: market.startTime,
    details: market.details,
    oddUsed: odd1,
    type: 'Winner',
    betPosition: 1,
    teamBet: awayTeam,
  });

  const spreadMarkets = market.children.filter(
    (child: any) => child.spread !== null
  );

  const totalMarkets = market.children.filter(
    (child: any) => child.total !== null
  );

  const buttons = [
    [
      {
        text: `═══ WINNER ═══`,
        callback_data: `0`,
      },
    ],
    [
      {
        text: `🎲 ${homeTeam} ${normalDecimalOdds[0]} Odds`,
        callback_data: buttonKey0,
      },
    ],
    [
      {
        text: `🎲 ${awayTeam} ${normalDecimalOdds[1]} Odds`,
        callback_data: buttonKey1,
      },
    ],
  ];

  await addSpreadData(market, baseKey, parleyBaseKey, spreadMarkets, buttons);
  await addTotaldata(market, baseKey, parleyBaseKey, totalMarkets, buttons);

  await bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: buttons,
    },
    parse_mode: 'Markdown',
    disable_notification: true,
  });
};

const showTrippleMarkets = async (
  chatId: number,
  message: string,
  parleyBaseKey: string,
  baseKey: string,
  market: any,
  homeTeam: string,
  awayTeam: string,
  normalDecimalOdds: number[],
  log: Logger
) => {
  const bot = getBot();

  const redisKey0 = `${baseKey}:0`;
  const redisKey1 = `${baseKey}:1`;
  const redisKey2 = `${baseKey}:2`;

  const buttonKey0 = `${parleyBaseKey}:0`;
  const buttonKey1 = `${parleyBaseKey}:1`;
  const buttonKey2 = `${parleyBaseKey}:2`;

  const odd0 = market.odds.decimalOddsArray[0];
  const odd1 = market.odds.decimalOddsArray[1];
  const odd2 = market.odds.decimalOddsArray[2];

  if (odd0 === 0 && odd1 === 0) {
    return null;
  }

  await Redis.setJSON(redisKey0, {
    parentAddress: market.address,
    address: market.address,
    startTime: market.startTime,
    details: market.details,
    oddUsed: odd0,
    type: 'Winner',
    betPosition: 0,
    teamBet: homeTeam,
  });
  await Redis.setJSON(redisKey1, {
    parentAddress: market.address,
    address: market.address,
    startTime: market.startTime,
    details: market.details,
    oddUsed: odd1,
    type: 'Winner',
    betPosition: 1,
    teamBet: awayTeam,
  });

  await Redis.setJSON(redisKey2, {
    parentAddress: market.address,
    address: market.address,
    startTime: market.startTime,
    details: market.details,
    oddUsed: odd2,
    type: 'Winner',
    betPosition: 2,
    teamBet: 'DRAW',
  });

  const spreadMarkets = market.children.filter(
    (child: any) => child.spread !== null
  );

  const totalMarkets = market.children.filter(
    (child: any) => child.total !== null
  );

  const buttons = [
    [
      {
        text: `═══ WINNER ═══`,
        callback_data: `0`,
      },
    ],
    [
      {
        text: `🎲 ${homeTeam} ${normalDecimalOdds[0]} Odds`,
        callback_data: buttonKey0,
      },
    ],
    [
      {
        text: `🎲 Draw ${normalDecimalOdds[2]} Odds`,
        callback_data: buttonKey2,
      },
    ],
    [
      {
        text: `🎲 ${awayTeam} ${normalDecimalOdds[1]} Odds`,
        callback_data: buttonKey1,
      },
    ],
  ];

  await addSpreadData(market, baseKey, parleyBaseKey, spreadMarkets, buttons);
  await addTotaldata(market, baseKey, parleyBaseKey, totalMarkets, buttons);

  await bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: buttons,
    },
    parse_mode: 'Markdown',
    disable_notification: true,
  });
};

export const showLeagueMarketBet = async (
  chatId: number,
  log: Logger,
  leagueBetKey: string
) => {
  const bot = getBot();
  try {
    const walletBalance = await getUserWallet(chatId, log);

    const data = await Redis.getJSON(leagueBetKey);

    const buttons = [
      {
        text: '$1',
        callback_data: '1',
      },
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

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: ${currencyFormatter(
        walletBalance.usdcAmount
      )} \n \n Enter bet amount or select a value`,
      {
        reply_markup: {
          inline_keyboard: [buttons],
        },
      }
    );

    leagueBetData[chatId] = { ...data, balance: walletBalance.usdcAmount };
    leagueBetState[chatId] = LeagueBetState.AWAITING_AMOUNT;
  } catch (error: any) {
    await clearLeagueBetStates(chatId);
    log.error(`Error on processing ${leagueBetKey} command ${error.message}`);
    await bot.sendMessage(chatId, 'Unable process bet, go to /start');
  }
};

export const leagueBetStateProgress = async (
  msg: TelegramBot.Message,
  log: Logger
) => {
  const chatId = msg.chat.id;
  const bot = getBot();

  if (leagueBetState[chatId] !== undefined) {
    switch (leagueBetState[chatId]) {
      case LeagueBetState.AWAITING_AMOUNT:
        try {
          const numberInput = Number(msg.text?.replace('$', ''));
          if (numberInput <= 0) {
            throw new Error('Invalid input. Please enter a number for amount.');
          }
          const walletBalance = await getUserWallet(chatId, log);

          const numberInputBn = new BigNumber(numberInput);

          if (numberInputBn.gt(walletBalance.usdcAmount)) {
            throw new Error('Insufficient balance');
          }

          leagueBetData[chatId].betAmount = numberInput;
          const data = leagueBetData[chatId];

          await showConfirmation(chatId, data, walletBalance.usdcAmount);

          leagueBetState[chatId] = LeagueBetState.AWAITING_CONFIRMATION;
        } catch (error: any) {
          clearLeagueBetStates(chatId);
          const buttons = [
            {
              text: '💰 WALLET',
              callback_data: '/wallet',
            },
            {
              text: '🏁 START OVER',
              callback_data: '/leagues',
            },
          ];
          const errMsg = `❌ ${error.message}`;
          await bot.sendMessage(chatId, errMsg, {
            reply_markup: {
              inline_keyboard: [buttons],
            },
            parse_mode: 'HTML',
          });
          return;
        }
        break;

      default:
        clearLeagueBetStates(chatId);
        break;
    }
  }
};

export const showConfirmation = async (
  chatId: number,
  data: any,
  userUsdcAmount: string
) => {
  const profit = Number(data.betAmount * data.oddUsed).toFixed(2);
  const bot = getBot();

  let type = `Winner`;

  if (data.type === 'Handicap') {
    type = `${data.type} (${data.spread})`;
  }

  if (data.type === 'Total') {
    type = `${data.type} ${data.side}(${data.total})`;
  }

  await bot.sendMessage(
    chatId,
    `💰 Wallet balance: ${currencyFormatter(userUsdcAmount)} \n
    ═══ * Bet details: * ═══
      Match: 🔥 ${data.details} 🔥
      Type: ${type}
      Team: ${data.teamBet}
      Bet Amount: $${data.betAmount}
      Odds: ${data.oddUsed}
      Potential Payout: $${profit}
      Network And Processing Fee: $1.50
    `,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '⤴️ PLACE BET',
              callback_data: 'confirmBet',
            },
            {
              text: '🏁 START OVER',
              callback_data: '/leagues',
            },
          ],
        ],
      },
      parse_mode: 'Markdown',
    }
  );
};

export const placeLeagueBet = async (chatId: number, log: Logger) => {
  const bot = getBot();
  try {
    const betData = leagueBetData[chatId];

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

    const url = `${config.api.url}/user/place-bet`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;

    await bot.sendMessage(
      chatId,
      `Your bet is being processed. Please have a little patience. 👍`
    );

    const res = await axios({
      method: 'post',
      url,
      data: {
        userAddress,
        contractAddress: betData.address,
        betAmount: betData.betAmount,
        betPosition: betData.betPosition,
        odds: betData.oddUsed,
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

      🔍 To check your bet details, use the * Positions *  tab.
      💰 When you're ready to claim your winnings, head over to the * Winnings * tab!
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

    await addDefaultFeeToUser(userAddress);
  } catch (error: any) {
    clearLeagueBetStates(chatId);
    const buttons = [
      {
        text: '🏁 START OVER',
        callback_data: '/leagues',
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

export const handleClaimWinnings = async (
  chatId: number,
  data: string,
  log: Logger
) => {
  const bot = getBot();
  const claimAddress = data.replace('claimWinings:', '');
  try {
    const address = await getUserAddress(chatId, log);

    const url = `${config.api.url}/user/claim`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;

    const res = await axios({
      method: 'post',
      url,
      data: {
        address,
        claimAddress,
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

export const showParlayChoice = async (
  chatId: number,
  betKey: string,
  log: Logger
) => {
  const bot = getBot();
  try {
    const key = `${config.redis.prefix.parlayAddDraft}${betKey}`;

    const buttons = [
      [{ text: '➕ Add to Parlay Draft', callback_data: key }],
      [{ text: '➡️ Continue as Single', callback_data: betKey }],
    ];

    const message = `
    🛠️ Parlay Options:

    Choose an option to manage your parlay draft:

    ➕ Add to Parlay Draft: Add your selection to the current parlay draft.

    ➡️ Continue as Single: Bet on this selection as a standalone single bet.

    Feel free to make your choice, and if you have any questions, we're here to help. Happy betting! 🎉🎮

`;

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  } catch (error: any) {
    clearLeagueBetStates(chatId);
    log.error(`Error while calling show parlay choise ${error.message}`);
    await bot.sendMessage(
      chatId,
      'Unable to load parlay and choise option. Try again or contact support.'
    );
  }
};

export const addToParlay = async (
  chatId: number,
  betKey: string,
  log: Logger
) => {
  const bot = getBot();

  try {
    const parlayRedisKey = `${config.redis.prefix.userParlay}${chatId}`;
    const parlayDraftExist = await Redis.exists(parlayRedisKey);

    const betDataExists = await Redis.exists(betKey);

    if (!betDataExists) {
      throw new Error('bet data doesnt exist');
    }

    let draft = [];

    if (parlayDraftExist) {
      draft = await Redis.getJSON(parlayRedisKey);
    }

    const betData = await Redis.getJSON(betKey);

    const startTime = new Date(betData.startTime);
    const now = new Date();

    const diffInMilliseconds = startTime.getTime() - now.getTime();

    const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(
      (diffInMilliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const diffInMinutes = Math.floor(
      (diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60)
    );

    let timeMessage = '';

    if (diffInDays > 0) {
      timeMessage += `${diffInDays} days, `;
    }
    if (diffInDays > 0 || diffInHours > 0) {
      timeMessage += `${diffInHours} hours, `;
    }
    timeMessage += `${diffInMinutes} minutes `;

    const positionData: ParlayPosition = {
      parentAddress: betData.parentAddress,
      betPosition: betData.betPosition,
      contract: betData.address,
      teamBet: betData.teamBet,
      details: betData.details,
      odds: betData.oddUsed,
      startTime: timeMessage,
      type: betData.type,
      spread: betData.spread,
      total: betData.total,
      side: betData.side,
    };

    const updatedPositions = addOrUpdatePosition(draft, positionData);

    await Redis.setJSON(parlayRedisKey, updatedPositions);
    clearLeagueBetStates(chatId);

    await bot.sendMessage(
      chatId,
      `
    Your position was added to the current Parlay draft

    Explore <b> 🏆 Leagues </b> and add more games to your parlay draft

    Go to <b> 🎫 Parlays </b> to manage your parlay

      `,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🏆 LEAGUES', callback_data: '/leagues' }],
            [{ text: '🎫 Parlays', callback_data: '/parlays' }],
          ],
        },
        parse_mode: 'HTML',
      }
    );
  } catch (error: any) {
    clearLeagueBetStates(chatId);
    log.error(`Error while calling show claim position ${error.message}`);
    await bot.sendMessage(
      chatId,
      'Unable to add to parlay draft, try again later or contact support'
    );
  }
};

export const addSpreadData = async (
  market: any,
  baseKey: string,
  parleyBaseKey: string,
  spreadMarkets: any,
  buttons: any
) => {
  for (const [index, element] of spreadMarkets.entries()) {
    if (element.isPaused || element.isCanceled) {
      continue;
    }

    buttons.push([
      {
        text: `═══ HANDICAP ═══`,
        callback_data: `0`,
      },
    ]);

    let homeIsFavored = false;

    const redisSpreadKey0 = `${baseKey}:spread:${index}:0`;
    const redisSpreadKey1 = `${baseKey}:spread:${index}:1`;

    const buttonSpreadKey0 = `${parleyBaseKey}:spread:${index}:0`;
    const buttonSpreadKey1 = `${parleyBaseKey}:spread:${index}:1`;

    const homeSpreadOdds = parseFloat(toDecimalOdds(element.homeOdds));
    const awaySpreadOdds = parseFloat(toDecimalOdds(element.awayOdds));
    const homeSpreadTeam = element.homeTeam;
    const awaySpreadTeam = element.awayTeam;

    const homeTeamOdds = market.odds.decimalOddsArray[0];
    const awayTeamOdds = market.odds.decimalOddsArray[1];

    const spreadValue = new BigNumber(element.spread).dividedBy(100).toFixed(1);
    const absoluteSpread = new BigNumber(spreadValue).abs().toFixed(1);

    homeIsFavored = homeTeamOdds < awayTeamOdds;

    const homeSpread = homeIsFavored
      ? `-${absoluteSpread}`
      : `+${absoluteSpread}`;
    const awaySpread = homeIsFavored
      ? `+${absoluteSpread}`
      : `-${absoluteSpread}`;

    const homeButtonLabel = `🎲 ${homeSpreadTeam} (${homeSpread}) ${homeSpreadOdds} Odds`;
    const awayButtonLabel = `🎲 ${awaySpreadTeam} (${awaySpread}) ${awaySpreadOdds} Odds`;

    const address = element.address;
    const details = `${homeSpreadTeam} vs ${awaySpreadTeam}`;

    await Redis.setJSON(redisSpreadKey0, {
      parentAddress: market.address,
      startTime: market.startTime,
      address,
      details,
      type: 'Handicap',
      spread: homeSpread,
      oddUsed: homeSpreadOdds,
      betPosition: 0,
      teamBet: homeSpreadTeam,
    });
    await Redis.setJSON(redisSpreadKey1, {
      parentAddress: market.address,
      startTime: market.startTime,
      address,
      details,
      type: 'Handicap',
      spread: awaySpread,
      oddUsed: awaySpreadOdds,
      betPosition: 1,
      teamBet: awaySpreadTeam,
    });

    buttons.push([
      {
        text: homeButtonLabel,
        callback_data: buttonSpreadKey0,
      },
    ]);

    buttons.push([
      {
        text: awayButtonLabel,
        callback_data: buttonSpreadKey1,
      },
    ]);
  }
};

export const addTotaldata = async (
  market: any,
  baseKey: string,
  parleyBaseKey: string,
  totalMarkets: any,
  buttons: any
) => {
  for (const [index, element] of totalMarkets.entries()) {
    if (element.isPaused || element.isCanceled) {
      continue;
    }

    buttons.push([
      {
        text: `═══ TOTAL ═══`,
        callback_data: `0`,
      },
    ]);

    const redisTotalKey0 = `${baseKey}:total:${index}:0`;
    const redisTotalKey1 = `${baseKey}:total:${index}:1`;

    const buttonTotalKey0 = `${parleyBaseKey}:total:${index}:0`;
    const buttonTotalKey1 = `${parleyBaseKey}:total:${index}:1`;

    const homeTotalOdds = parseFloat(toDecimalOdds(element.homeOdds));
    const awayTotalOdds = parseFloat(toDecimalOdds(element.awayOdds));
    const homeTotalTeam = element.homeTeam;
    const awayTotalTeam = element.awayTeam;
    const total = new BigNumber(element.total).dividedBy(100).toFixed(1);

    const address = element.address;
    const details = `${homeTotalTeam} vs ${awayTotalTeam}`;

    await Redis.setJSON(redisTotalKey0, {
      parentAddress: market.address,
      startTime: market.startTime,
      address,
      details,
      type: 'Total',
      total: total,
      side: 'Over',
      oddUsed: homeTotalOdds,
      betPosition: 0,
      teamBet: homeTotalTeam,
    });
    await Redis.setJSON(redisTotalKey1, {
      parentAddress: market.address,
      startTime: market.startTime,
      address,
      details,
      type: 'Total',
      total: total,
      side: 'Under',
      oddUsed: awayTotalOdds,
      betPosition: 1,
      teamBet: awayTotalTeam,
    });

    buttons.push([
      {
        text: `🎲 Over (${total}) ${homeTotalOdds} Odds`,
        callback_data: buttonTotalKey0,
      },
    ]);

    buttons.push([
      {
        text: `🎲 Under (${total}) ${awayTotalOdds} Odds`,
        callback_data: buttonTotalKey1,
      },
    ]);
  }
};
