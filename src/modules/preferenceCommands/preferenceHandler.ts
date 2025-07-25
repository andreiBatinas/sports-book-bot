import TelegramBot from 'node-telegram-bot-api';

import { getBot } from '../../botInit';
import { Logger } from '../../infrastructure/logger';
import { currencyFormatter } from '../../sevices/curency';
import { getUserWallet } from '../../sevices/userApi';
import { clearAllStates } from '../states';
import {
  preferencesDelegateConfirm,
  preferencesStateProgress,
} from './preferenceHelper';
import { PreferencesState, preferencesState } from './preferencesState';

const log = new Logger('Delegate Commands');

export const handlePreferences = async (msg: TelegramBot.Message) => {
  const bot = getBot();
  const chatId = msg.chat.id;
  clearAllStates(chatId);

  try {
    const walletBalance = await getUserWallet(chatId, log);

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: <b> ${currencyFormatter(
        walletBalance.usdcAmount
      )} </b> \n \n Hello! Here you can customize your account settings to better match your needs:

      1️⃣ <b>Delegate Volume</b> - Delegate your volume to your wallet used for  staking Thales tokens.

      👉 To make a selection, just tap on the corresponding option.

      `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📲 DELEGATE VOLUME',
                callback_data: 'account:delegate',
              },
            ],
          ],
        },
        parse_mode: 'HTML',
      }
    );
  } catch (error: any) {
    log.error(`Error on /prefences command ${error.message}`);
    await bot.sendMessage(
      chatId,
      'Unable to show preferences options, go to /start or contact support.'
    );
  }
};

export const handleCallbackQuery = async (
  callbackQuery: TelegramBot.CallbackQuery
) => {
  const chatId = callbackQuery.from.id;
  const data = callbackQuery.data;

  if (data === '/preference') {
    clearAllStates(chatId);
    handlePreferences(callbackQuery.message as TelegramBot.Message);
    return;
  }

  if (data === 'account:delegate') {
    clearAllStates(chatId);
    handleAccountDelegate(chatId);
    return;
  }

  if (data === 'account:delegate:confirm') {
    await preferencesDelegateConfirm(callbackQuery, log);
    return;
  }
};

export const handleAccountDelegate = async (chatId: number) => {
  const bot = getBot();

  try {
    const walletBalance = await getUserWallet(chatId, log);
    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: ${currencyFormatter(walletBalance.usdcAmount)} \n
      Paste the address to you wish to delegate volume to on * Arbitrum *


        `,
      {
        reply_markup: {
          force_reply: true,
        },
        parse_mode: 'Markdown',
      }
    );

    preferencesState[chatId] = PreferencesState.AWAITING_ADDRESS;
  } catch (error: any) {
    log.error(`Error on account:delegate message ${error.message}`);
    await bot.sendMessage(
      chatId,
      '❌ Error: Please try again or contact support if issue persists'
    );
  }
};

export const preferencesHandleMessage = async (msg: TelegramBot.Message) => {
  const chatId = msg.chat.id;

  if (!msg.text) {
    console.log('audio message ? => ', msg);
    return;
  }
  if (preferencesState[chatId] !== undefined) {
    await preferencesStateProgress(msg, log);
    return;
  }
};
