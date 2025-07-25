import axios from 'axios';
import { isAddress } from 'ethers/lib/utils';
import TelegramBot from 'node-telegram-bot-api';

import { getBot } from '../../botInit';
import { config } from '../../config';
import { Logger } from '../../infrastructure/logger';
import { currencyFormatter } from '../../sevices/curency';
import { getUserWallet } from '../../sevices/userApi';
import {
  clearPreferencesStates,
  preferencesData,
  PreferencesState,
  preferencesState,
} from './preferencesState';

export const preferencesStateProgress = async (
  msg: TelegramBot.Message,
  log: Logger
) => {
  const chatId = msg.chat.id;
  const bot = getBot();

  if (preferencesState[chatId] !== undefined) {
    switch (preferencesState[chatId]) {
      case PreferencesState.AWAITING_ADDRESS:
        try {
          const address = msg.text;

          if (address === undefined) {
            throw new Error('Address is undefined');
          }

          if (!isAddress(address)) {
            throw new Error('Address is invalid');
          }

          preferencesData[chatId] = {
            address,
          };

          await bot.sendMessage(
            chatId,
            `
            ═══ * Delegate Summary * ═══
              Destination wallet:
                * ${address} *
            `,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '⤴️ CONFIRM',
                      callback_data: 'account:delegate:confirm',
                    },
                    {
                      text: '🏁 START OVER',
                      callback_data: '/preference',
                    },
                  ],
                ],
              },
              parse_mode: 'Markdown',
            }
          );
        } catch (error: any) {
          clearPreferencesStates(chatId);
          log.error(`Error on account:delegate message ${error.message}`);
          await bot.sendMessage(
            chatId,
            '❌ Invalid address. Please try again.'
          );
        }
        break;

      default:
        clearPreferencesStates(chatId);
        break;
    }
  }
};

export const preferencesDelegateConfirm = async (
  callbackQuery: TelegramBot.CallbackQuery,
  log: Logger
) => {
  const chatId = callbackQuery.from.id;
  const bot = getBot();

  try {
    const walletBalance = await getUserWallet(chatId, log);

    const userAddress = walletBalance.address;
    const destinationAddress = preferencesData[chatId].address;

    if (destinationAddress === undefined) {
      await bot.sendMessage(chatId, '❌ Error. Please start over');
      return;
    }

    const isSend = await delegateVolume(
      chatId,
      userAddress,
      destinationAddress
    );

    if (!isSend) {
      await bot.sendMessage(
        chatId,
        '❌ Error. Please start over or contact support.'
      );
      return;
    }

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: ${currencyFormatter(walletBalance.usdcAmount)} \n
      🎉 Volume successfully delegated! Good luck!

      `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🏆 LEAGUES',
                callback_data: '/leagues',
              },
              {
                text: '🏁 START',
                callback_data: '/start',
              },
            ],
          ],
        },
      }
    );

    clearPreferencesStates(chatId);
  } catch (error: any) {
    clearPreferencesStates(chatId);

    log.error(`Error on account:delegate:confirm message ${error.message}`);
    await bot.sendMessage(
      chatId,
      '❌ Error: Please try again or contact support if issue persists'
    );
  }
};

export const delegateVolume = async (
  chatId: number,
  userAddress: string,
  destinationAddress: string
) => {
  try {
    const url = `${config.api.url}/user/delegate-volume`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;

    const res = await axios({
      method: 'post',
      url,
      data: {
        userAddress,
        destinationAddress,
      },
      headers: { [privateHeader]: privateKey },
    });

    if (res.data.status === 'fail') {
      return false;
    }

    return true;
  } catch (error) {
    throw new Error(`Error while calling withdraw Funds ${error}`);
  }
};
