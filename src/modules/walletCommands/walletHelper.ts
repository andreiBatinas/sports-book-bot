import axios from 'axios';
import BigNumber from 'bignumber.js';
import { isAddress } from 'ethers/lib/utils';
import TelegramBot from 'node-telegram-bot-api';

import { getBot } from '../../botInit';
import { config } from '../../config';
import { Logger } from '../../infrastructure/logger';
import { currencyFormatter } from '../../sevices/curency';
import { getUserWallet } from '../../sevices/userApi';
import {
  clearWalletStates,
  walletData,
  WalletState,
  walletState,
} from './walletState';

const withdrawFunds = async (
  chatId: number,
  userAddress: string,
  destinationAddress: string,
  amount: string
) => {
  try {
    const url = `${config.api.url}/user/withdraw-funds`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;

    const res = await axios({
      method: 'post',
      url,
      data: {
        userAddress,
        destinationAddress,
        amount,
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

export const walletInfo = async (chatId: number, log: Logger) => {
  const bot = getBot();
  try {
    const walletBalance = await getUserWallet(chatId, log);

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: ${currencyFormatter(
        walletBalance.usdcAmount
      )} \n \n Please select whether you’d like to withdraw or deposit funds into your Wallet:`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '⤴️ WITHDRAW',
                callback_data: 'wallet:withdraw',
              },
              {
                text: '⤵️ DEPOSIT',
                callback_data: 'wallet:deposit',
              },
            ],
          ],
        },
      }
    );
  } catch (error) {
    console.log('Error on /wallet command', error);
    await bot.sendMessage(
      chatId,
      'Unable to fetch the wallet details, go to /start'
    );
  }
};

export const walletDeposit = async (
  callbackQuery: TelegramBot.CallbackQuery,
  log: Logger
) => {
  const chatId = callbackQuery.from.id;
  const bot = getBot();

  try {
    const walletBalance = await getUserWallet(chatId, log);

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: <b>${currencyFormatter(walletBalance.usdcAmount)}</b>

      🌐 Select the network you want to deposit on: \n
        `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🌐 ETHEREUM',
                callback_data: 'wallet:deposit:ethereum',
              },
              {
                text: '🔷 Arbitrum',
                callback_data: 'wallet:deposit:arbitrum',
              },
            ],
          ],
        },
        parse_mode: 'HTML',
      }
    );
  } catch (error: any) {
    log.error(`Error while sending deposit message ${error.message}`);
    await bot.sendMessage(
      chatId,
      '❌ Error: Please try again or contact support if issue persists'
    );
  }
};

export const walletDepositArbitrum = async (
  callbackQuery: TelegramBot.CallbackQuery,
  log: Logger
) => {
  const chatId = callbackQuery.from.id;
  const bot = getBot();

  try {
    const walletBalance = await getUserWallet(chatId, log);

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: <b>${currencyFormatter(
        walletBalance.usdcAmount
      )}</b> \n \n

      🔵 <b>Arbitrum network</b>
      🔵 <b>USDC.e</b>

      Copy this address and past it into the field at the <b> Arbitrum </b> exchange of your choice:\n
     <code>${walletBalance.address} </code> \n \n
    ⚠️ You may only deposit USDC.e (Bridged USDC) on this network.
        `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '🏁 BACK TO START',
                callback_data: '/start',
              },
            ],
          ],
        },
        parse_mode: 'HTML',
      }
    );
  } catch (error: any) {
    log.error(`Error while sending deposit message ${error.message}`);
    await bot.sendMessage(
      chatId,
      '❌ Error: Please try again or contact support if issue persists'
    );
  }
};

export const walletDepositEthereum = async (
  callbackQuery: TelegramBot.CallbackQuery,
  log: Logger
) => {
  const chatId = callbackQuery.from.id;
  const bot = getBot();

  try {
    const walletBalance = await getUserWallet(chatId, log);

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: <b>${currencyFormatter(
        walletBalance.usdcAmount
      )}</b> \n \n

      🔵 <b>ETHEREUM network</b>
      🔵 <b>ETH</b>

      Copy this address and past it into the field at the <b> Ethereum </b> exchange of your choice:\n
     <code>${walletBalance.address} </code> \n \n
    ⚠️ You may only deposit Ethereum on this network.
        `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💰 BACK TO START',
                callback_data: '/start',
              },
            ],
          ],
        },
        parse_mode: 'HTML',
      }
    );
  } catch (error: any) {
    log.error(`Error while sending deposit message ${error.message}`);
    await bot.sendMessage(
      chatId,
      '❌ Error: Please try again or contact support if issue persists'
    );
  }
};

export const walletWithdraw = async (
  callbackQuery: TelegramBot.CallbackQuery,
  log: Logger
) => {
  const chatId = callbackQuery.from.id;
  const bot = getBot();

  try {
    const walletBalance = await getUserWallet(chatId, log);

    await bot.sendMessage(
      chatId,
      `💰 Wallet balance: ${currencyFormatter(walletBalance.usdcAmount)} \n
      Paste the address to receive * USDC.e * on * Arbitrum *
        `,
      {
        reply_markup: {
          force_reply: true,
        },
        parse_mode: 'Markdown',
      }
    );

    walletState[chatId] = WalletState.AWAITING_ADDRESS;
  } catch (error: any) {
    log.error(`Error on wallet:withdraw message ${error.message}`);
    await bot.sendMessage(
      chatId,
      '❌ Error: Please try again or contact support if issue persists'
    );
  }
};

export const walletWithdrawConfirm = async (
  callbackQuery: TelegramBot.CallbackQuery,
  log: Logger
) => {
  const chatId = callbackQuery.from.id;
  const bot = getBot();

  try {
    const walletBalance = await getUserWallet(chatId, log);

    const userAddress = walletBalance.address;
    const destinationAddress = walletData[chatId].address;

    if (destinationAddress === undefined) {
      await bot.sendMessage(chatId, '❌ Error. Please start over');
      return;
    }

    const amount = walletData[chatId].usdcAmount;

    if (amount === undefined) {
      await bot.sendMessage(chatId, '❌ Error. Please start over');
      return;
    }

    const isSend = await withdrawFunds(
      chatId,
      userAddress,
      destinationAddress,
      amount
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
      The withdrawal of $${amount} was sent successfully!
      Your balance will update shortly.
      Feel free to go to the * Wallet * to check balance, or head over to the * Leagues * to explore more.
       Thank you for using our service!

      `,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '💰 WALLET',
                callback_data: '/wallet',
              },
              {
                text: '🏆 LEAGUES',
                callback_data: '/leagues',
              },
            ],
          ],
        },
      }
    );
    clearWalletStates(chatId);
  } catch (error: any) {
    log.error(`Error on wallet:withdraw message ${error.message}`);
    await bot.sendMessage(
      chatId,
      '❌ Error: Please try again or contact support if issue persists'
    );
  }
};

export const walletStateProgress = async (
  msg: TelegramBot.Message,
  log: Logger
) => {
  const chatId = msg.chat.id;
  const bot = getBot();

  if (walletState[chatId] !== undefined) {
    switch (walletState[chatId]) {
      case WalletState.AWAITING_ADDRESS:
        try {
          const address = msg.text;

          if (address === undefined) {
            throw new Error('Address is undefined');
          }

          if (!isAddress(address)) {
            throw new Error('Address is invalid');
          }

          walletData[chatId] = {
            address: msg.text,
          };

          await bot.sendMessage(chatId, 'Enter USDC.e amount to withdraw: ', {
            reply_markup: {
              force_reply: true,
            },
          });

          walletState[chatId] = WalletState.AWAITING_AMOUNT;
        } catch (error: any) {
          clearWalletStates(chatId);
          log.error(
            `Error on wallet:withdraw:address message ${error.message}`
          );
          await bot.sendMessage(
            chatId,
            '❌ Invalid address. Please try again.'
          );
        }
        break;
      case WalletState.AWAITING_AMOUNT:
        const amount = msg.text;
        try {
          if (amount === undefined) {
            throw new Error('Amount is undefined');
          }

          const userInfo = await getUserWallet(chatId, log);

          const amountBn = new BigNumber(amount);
          const userAmount = new BigNumber(userInfo.usdcAmount);

          if (!amountBn.isPositive()) {
            throw new Error('Amount is lower than 0');
          }

          if (amountBn.gt(userAmount)) {
            throw new Error('Amount is higher than funds');
          }

          walletData[chatId].usdcAmount = amount;

          await bot.sendMessage(
            chatId,
            `💰 Wallet balance: ${currencyFormatter(userInfo.usdcAmount)} \n
            ═══ * Withdraw details: * ═══
              Destination wallet:
              * ${walletData[chatId].address} *
              USDC.e Amount: $${amount}
              Network And Processing Fee: $1.50
            `,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '⤴️ WITHDRAW NOW',
                      callback_data: 'wallet:withdraw:confirm',
                    },
                    {
                      text: '🏁 START OVER',
                      callback_data: '/wallet',
                    },
                  ],
                ],
              },
              parse_mode: 'Markdown',
            }
          );
        } catch (error: any) {
          clearWalletStates(chatId);
          log.error(`Error on wallet:withdraw:amount message ${error.message}`);
          await bot.sendMessage(
            chatId,
            '❌ Error. Please try again or contact support.'
          );
        }
        break;
      default:
        clearWalletStates(chatId);
        break;
    }
  }
};
