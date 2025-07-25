import BigNumber from 'bignumber.js';
import TelegramBot from 'node-telegram-bot-api';

import { getBot } from '../../botInit';
import { Logger } from '../../infrastructure/logger';
import { getUserWallet } from '../../sevices/userApi';
import { LeagueBetState } from '../leagueCommands/leagueState';
import { clearAllStates } from '../states';
import {
  handleClaimParlays,
  handleConfirmParlay,
  handleDraftParlays,
  handleParlayPositions,
  handleParlays,
  handleParlayWinnings,
  handleResetParlays,
  handleStartParlayBet,
  showParlayConfirmation,
} from './parlayHelper';
import {
  clearParlaysBetStates,
  parlaysBetData,
  parlaysBetState,
  ParlaysState,
} from './parlaysState';

const log = new Logger('ParlayHandler');

export const handleGlobalParlays = async (
  msg: TelegramBot.Message,
  match: any
) => {
  const chatId = msg.chat.id;
  clearAllStates(chatId);
  await handleParlays(chatId);
};

export const parlaysHandleCallbackQuery = async (
  callbackQuery: TelegramBot.CallbackQuery
) => {
  const chatId = callbackQuery.from.id;
  const data = callbackQuery.data;
  const bot = getBot();

  if (data === '/parlays') {
    clearAllStates(chatId);
    handleParlays(chatId);
    return;
  }

  if (data === 'parlays:draft') {
    handleDraftParlays(chatId);
  }

  if (data === 'parlays:startBet') {
    handleStartParlayBet(chatId);
  }

  if (data === 'parlays:reset') {
    handleResetParlays(chatId);
  }

  if (data === 'parlays:bet:confirm') {
    handleConfirmParlay(chatId);
  }

  if (data === 'parlay:positions') {
    handleParlayPositions(chatId);
  }

  if (data === 'parlays:winnings') {
    handleParlayWinnings(chatId);
  }

  if (data?.startsWith('claimParlays:')) {
    handleClaimParlays(chatId, data, log);
  }

  if (
    parlaysBetState[chatId] !== undefined &&
    parlaysBetState[chatId] === ParlaysState.AWAITING_AMOUNT
  ) {
    try {
      const numberInput = Number(data);
      if (numberInput < 5) {
        throw new Error(
          'Invalid input. Please enter a number higher than 5 for amount. '
        );
      }

      const walletBalance = await getUserWallet(chatId, log);

      const numberInputBn = new BigNumber(numberInput);

      if (numberInputBn.gt(walletBalance.usdcAmount)) {
        throw new Error('Insufficient balance');
      }

      parlaysBetData[chatId] = { betAmount: numberInput };
      const parlayData = parlaysBetData[chatId];

      await showParlayConfirmation(
        chatId,
        parlayData,
        walletBalance.usdcAmount
      );

      parlaysBetState[chatId] = LeagueBetState.AWAITING_CONFIRMATION;
    } catch (error: any) {
      clearParlaysBetStates(chatId);
      const buttons = [
        {
          text: '💰 WALLET',
          callback_data: '/wallet',
        },
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
      return;
    }
  }
};
