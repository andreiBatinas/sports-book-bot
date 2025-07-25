import axios from 'axios';
import BigNumber from 'bignumber.js';
import TelegramBot from 'node-telegram-bot-api';

import { getBot } from '../../botInit';
import { config } from '../../config';
import { Logger } from '../../infrastructure/logger';
import { Redis } from '../../infrastructure/redis';
import { getUsdcAmountForAddress } from '../../sevices/chain-utils';
import { getUserAddress, getUserApi } from '../../sevices/userApi';
import { clearAllStates } from '../states';

const log = new Logger('General Commands');

//TODO: set this up
const setupUserFees = async (userAddress: string) => {
  try {
    const userFeesKey = `${config.redis.prefix.userFeesPrefix}${userAddress}`;
    const userFeesExist = await Redis.exists(userFeesKey);

    if (!userFeesExist) {
      await Redis.setJSON(userFeesKey, {
        fees: '0',
      });
    }
  } catch (error: any) {
    log.error(`error setting up user fees ${error.message}`);
  }
};

export const handleStart = async (msg: TelegramBot.Message, match: any) => {
  const bot = getBot();
  const chatId = msg.chat.id;
  clearAllStates(chatId);

  try {
    let userInfo;
    const userInfoKey = `${config.redis.prefix.chatIdUserInfo}:${chatId}`;
    const userInfoExists = await Redis.exists(userInfoKey);

    if (!userInfoExists) {
      userInfo = await getUserApi(chatId, log);
      if (!userInfo) {
        log.error(
          `Error trying to run /start, userinfo null, cannot reach server`
        );
        return await bot.sendMessage(
          chatId,
          '❌ Error: Please try again or contact support if issue persists'
        );
      }

      await Redis.setJSON(userInfoKey, userInfo);
    } else {
      userInfo = await Redis.getJSON(userInfoKey);
    }

    const address = userInfo.address;
    const usdcAmount = await getUsdcAmountForAddress(address);

    await setupUserFees(address);

    const message = `
    <b>bot ⬩ Sports Bets</b>
    Place sports bets with ease and elite speed.

    🔵 <b>On the Arbitrum Network</b>
    🔵 <b>USDC.E</b>

    ════ <b>Your Wallet</b> ═══
    Balance: <b>${usdcAmount} USDC.e</b>
    Address: <code>${address}</code>

    <i>We now offer both Ethereum deposits on the Ethereum chain and USDC.e deposits on the Arbitrum chain! To see more information on deposits and get started, please go to the wallet tab.</i>
    Happy betting! 🎉

    `;

    const buttons = [
      [
        { text: '❓ HELP', callback_data: '/help' },
        { text: '📚 DOCS', callback_data: '/docs' },
      ],
      [{ text: '⚙️ PREFERENCES', callback_data: '/preference' }],
      [{ text: '🏆 LEAGUES', callback_data: '/leagues' }],
      [{ text: '📋 POSITIONS', callback_data: '/positions' }],
      [{ text: '🎫 PARLAYS', callback_data: '/parlays' }],
      [
        { text: '💰 WALLET', callback_data: '/wallet' },
        { text: '💸 WINNINGS', callback_data: '/winnings' },
      ],
    ];

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: buttons,
      },
      parse_mode: 'HTML',
    });
  } catch (error: any) {
    log.error(`Error trying to run /start error: ${error.message}`);
    await bot.sendMessage(
      chatId,
      '❌ Error: Please try again or contact support if issue persists'
    );
  }
};

export const handleGlobalWinnings = async (
  msg: TelegramBot.Message,
  match: any
) => {
  const chatId = msg.chat.id;
  await handleTopWinnings(chatId);
};

export const handleGlobalPositions = async (
  msg: TelegramBot.Message,
  match: any
) => {
  const chatId = msg.chat.id;
  await handleTopPositions(chatId);
};

export const handleHelpGlobal = async (
  msg: TelegramBot.Message,
  match: any
) => {
  const chatId = msg.chat.id;
  await handleHelp(chatId);
};

const handleHelp = async (chatId: number) => {
  const bot = getBot();

  const message =
    `\n` +
    `🏆 /leagues: View Available Leagues\n` +
    `🎫 /parlays: View your default Parlay\n` +
    `📋 /positions: View your open positions\n` +
    `💸 /winnings: View winning positions\n` +
    `💰 /wallet: View your balance, withdraw, and deposit\n` +
    `\n` +
    `❓ /help: Help! Prints a full list of actions\n` +
    `📚 /docs: Link to the bot documentation\n` +
    `\n`;

  try {
    await bot.sendMessage(chatId, message);
  } catch (err) {
    console.error('Error showHelpMessage', err);
  }
};

export const handleCallbackQuery = async (
  callbackQuery: TelegramBot.CallbackQuery
) => {
  const chatId = callbackQuery.from.id;
  const data = callbackQuery.data;

  if (data == '/help') {
    clearAllStates(chatId);
    handleHelp(chatId);
    return;
  }

  if (data == '/positions') {
    clearAllStates(chatId);
    handleTopPositions(chatId);
    return;
  }

  if (data === 'sports:positions') {
    clearAllStates(chatId);
    handlePositions(chatId);
  }

  if (data === '/winnings') {
    clearAllStates(chatId);
    handleTopWinnings(chatId);
    return;
  }

  if (data === 'sports:winnings') {
    clearAllStates(chatId);
    handleWinnings(chatId);
  }

  if (data == '/start') {
    clearAllStates(chatId);
    handleStart(callbackQuery.message as TelegramBot.Message, null);
    return;
  }
  // if (data === '/wallet') {
  //   clearAllStates(chatId);
  //   walletInfo(chatId, log);
  //   return;
  // }
};

export const handleTopPositions = async (chatId: number) => {
  const bot = getBot();

  try {
    const message = `
    ═══ * Select which open positions you want to see * ═══

    `;

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📋 SINGLE POSITIONS',
              callback_data: 'sports:positions',
            },
            {
              text: '🎫 PARLAYS',
              callback_data: 'parlay:positions',
            },
          ],
        ],
      },
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    log.error(`Error while handling top positions `);
    await bot.sendMessage(
      chatId,
      'Unable process top positions, try again later or contact support'
    );
  }
};

export const handleTopWinnings = async (chatId: number) => {
  const bot = getBot();

  try {
    const message = `
    ═══ * Select which winnings you want to see * ═══

    `;

    await bot.sendMessage(chatId, message, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📋 SINGLE POSITIONS',
              callback_data: 'sports:winnings',
            },
            {
              text: '🎫 PARLAYS',
              callback_data: 'parlays:winnings',
            },
          ],
        ],
      },
      parse_mode: 'Markdown',
    });
  } catch (error: any) {
    log.error(`Error while handling top positions `);
    await bot.sendMessage(
      chatId,
      'Unable process top positions, try again later or contact support'
    );
  }
};

export const handlePositions = async (chatId: number) => {
  await clearAllStates(chatId);
  const bot = getBot();
  try {
    const address = await getUserAddress(chatId, log);

    const url = `${config.api.url}/user/open-positions`;
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

    const positionsList = openPositions
      .map((position: any) => {
        let betInfo = `🏆 You bet on: ${position.betOnTeam}`;
        let typeInfo = `🃏 Bet Type: ${position.type}`;

        if (position.type === 'Total') {
          const total = new BigNumber(position.total)
            .dividedBy(100)
            .decimalPlaces(2);
          betInfo = `🏆 You bet on: ${position.betOnTeam} (${total})`; // Include 'Over' or 'Under' and total for 'Total'
        }

        if (position.type === 'Handicap') {
          const spread = new BigNumber(position.spread)
            .dividedBy(100)
            .decimalPlaces(2);
          betInfo = `🏆 You bet on: ${position.betOnTeam} (Spread: ${spread})`; // Include team and spread for 'Handicap'
        }

        return `
      🎮 Match: ${position.details}
      ${typeInfo}
      ${betInfo}
      💰 Position Size: $${position.positionSize}
      📅 Start Date: ${new Date(position.startDate).toLocaleString()}
  `;
      })
      .join('\n');

    const message = `
      🔥 Here are your open positions 🔥
      ${positionsList}
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
  } catch (error) {
    log.error(`Error while calling show open positions ${error}`);
    await bot.sendMessage(
      chatId,
      'Unable process open positions, try again later or contact support'
    );
  }
};

export const handleWinnings = async (chatId: number) => {
  await clearAllStates(chatId);
  const bot = getBot();

  try {
    const address = await getUserAddress(chatId, log);

    const url = `${config.api.url}/user/winning-positions`;
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

    const winningPositions = res.data;

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
      const address = market.address;
      const amount = new BigNumber(market.amount).dividedBy(1e18).toFixed(2, 0);
      const details = market.details;

      const message = `🎉 Congrats on your bet: \n * ${details} *! 🥳 \n You've bagged * $${amount} *. \n Hit the button below to claim your winnings now! 💰`;

      const button = [
        {
          text: `Claim`,
          callback_data: `claimWinings:${address}`,
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
  } catch (error) {
    log.error(`Error while calling show claimable positions ${error}`);
    await bot.sendMessage(
      chatId,
      'Unable process winning positions, try again later or contact support'
    );
  }
};
