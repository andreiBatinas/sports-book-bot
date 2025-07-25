import BigNumber from 'bignumber.js';
import TelegramBot from 'node-telegram-bot-api';

import { getBot } from '../../botInit';
import { Logger } from '../../infrastructure/logger';
import { getUserWallet } from '../../sevices/userApi';
import { clearAllStates } from '../states';
import {
  addToParlay,
  handleClaimWinnings,
  leagueBetStateProgress,
  leaguesInfo,
  placeLeagueBet,
  showConfirmation,
  showLeagueMarketBet,
  showLeagueMarkets,
  showParlayChoice,
} from './leagueHelper';
import {
  LeagueBetState,
  clearLeagueBetStates,
  leagueBetData,
  leagueBetState,
} from './leagueState';

const log = new Logger('Leagues');

export const handleLeague = async (chatId: number, leagueKey: string) => {
  clearAllStates(chatId);
  await showLeagueMarkets(chatId, log, leagueKey);
};

export const handleLeagueBet = async (chatId: number, leagueBetKey: string) => {
  // clearAllStates(chatId);
  await showLeagueMarketBet(chatId, log, leagueBetKey);
};

export const handleParlayChoice = async (chatId: number, betKey: string) => {
  await showParlayChoice(chatId, betKey, log);
};

export const handleAddToParlay = async (chatId: number, betKey: string) => {
  await addToParlay(chatId, betKey, log);
};

export const handleConfirmedBet = async (chatId: number) => {
  await placeLeagueBet(chatId, log);
};

export const handleLeagues = async (msg: TelegramBot.Message, match: any) => {
  const chatId = msg.chat.id;
  clearAllStates(chatId);
  await leaguesInfo(chatId, log);
};

export const leaguesHandleCallbackQuery = async (
  callbackQuery: TelegramBot.CallbackQuery
) => {
  const chatId = callbackQuery.from.id;
  const data = callbackQuery.data;
  const bot = getBot();

  if (data === '/leagues') {
    clearAllStates(chatId);
    leaguesInfo(chatId, log);
    return;
  }

  if (data?.startsWith('leagues:')) {
    const leagueKey = data.replace('leagues:', '');
    handleLeague(chatId, leagueKey);
    return;
  }

  if (data?.startsWith('MB:')) {
    handleLeagueBet(chatId, data);
    return;
  }

  if (data?.startsWith('PC:')) {
    const betKey = data.replace('PC:', '');
    handleParlayChoice(chatId, betKey);
    return;
  }

  if (data?.startsWith('PAD:')) {
    const betKey = data.replace('PAD:', '');
    handleAddToParlay(chatId, betKey);
    return;
  }

  if (data === 'confirmBet') {
    handleConfirmedBet(chatId);
    return;
  }

  if (data?.startsWith('claimWinings:')) {
    handleClaimWinnings(chatId, data, log);
  }

  if (
    leagueBetState[chatId] !== undefined &&
    leagueBetState[chatId] === LeagueBetState.AWAITING_AMOUNT
  ) {
    try {
      const numberInput = Number(data);
      if (numberInput <= 0) {
        throw new Error('Invalid input. Please enter a number for amount.');
      }
      const walletBalance = await getUserWallet(chatId, log);

      const numberInputBn = new BigNumber(numberInput);

      if (numberInputBn.gt(walletBalance.usdcAmount)) {
        throw new Error('Insufficient balance');
      }

      leagueBetData[chatId].betAmount = numberInput;
      const BetData = leagueBetData[chatId];

      await showConfirmation(chatId, BetData, walletBalance.usdcAmount);
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
  }
};

export const leaguesHandleMessage = async (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;
  const bot = getBot();

  if (!msg.text) {
    log.error(`audio message ? => ${msg} `);
    await bot.sendMessage(chatId, '❌ Error: Please try again');
    return;
  }

  if (leagueBetState[chatId] !== undefined) {
    await leagueBetStateProgress(msg, log);
    return;
  }
};
