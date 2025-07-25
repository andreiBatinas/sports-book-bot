import 'dotenv/config';

import TelegramBot from 'node-telegram-bot-api';

import { getBot, setUpTgBot } from './botInit';
import { Logger } from './infrastructure/logger';
import { RedisConnect } from './infrastructure/redis';
import { setupGeneralComands } from './modules/generalCommands';
import { setupLeagueCommands } from './modules/leagueCommands';
import { setupParlayCommands } from './modules/parlaysCommands';
import { setupPreferencesCommands } from './modules/preferenceCommands';
import { setupWalletCommands } from './modules/walletCommands';
import { createUserApi } from './sevices/userApi';

async function main() {
  setUpTgBot();

  const bot = getBot();
  const log = new Logger('main');

  bot.on('message', async (msg: TelegramBot.Message) => {
    const chatId = msg.chat.id;

    if (msg.new_chat_members && msg.new_chat_members.length > 0) {
      try {
        try {
          await createUserApi(chatId, log);
        } catch (error: any) {
          log.error(
            `Unable to create user, possibility it's a returning user ${error.message}`
          );
        }

        await bot.sendMessage(
          chatId,
          `🚀 Welcome to the official bot! 🚀
          🚫 No KYC!
          🌍 Bet from Everywhere, Anytime! ⏰
          🏆 Place sports bets decentralized.
          ⛽ No more gas fee headaches!
          📊 Track your bets anytime.
          💰 Plus, earn your share of our revenue!

          Type /start to dive in and may the odds be in your favor! 🍀🤑

          `
        );
      } catch (err: any) {
        log.error(`Error on new chat member message ${err.message}`);
      }
    }
  });

  setupGeneralComands();
  setupWalletCommands();
  setupLeagueCommands();
  setupParlayCommands();
  setupPreferencesCommands();

  RedisConnect();

  log.info('Application started');

  enum ProcessClose {
    UncaughtException = 'uncaughtException',
    UnhandledRejection = 'unhandledRejection',
    SignalInterrupt = 'SIGINT',
    SignalTerminate = 'SIGTERM',
    Exit = 'exit',
  }

  process.on(ProcessClose.UncaughtException, (err: Error) => {
    log.error(
      `[Application][handleExit] Process error ${ProcessClose.UncaughtException} ${err}`
    );
    shutdownGracefully(1);
  });

  process.on(
    ProcessClose.UnhandledRejection,
    (reason: Record<string, unknown> | null | undefined) => {
      log.error(
        `[Application][handleExit] Process error ${ProcessClose.UnhandledRejection} ${reason}`
      );
      shutdownGracefully(2);
    }
  );

  process.on(ProcessClose.SignalInterrupt, () => {
    log.info(
      `[Application][handleExit] Process exit ${ProcessClose.SignalInterrupt}`
    );
    shutdownGracefully(128 + 2);
  });

  process.on(ProcessClose.SignalTerminate, () => {
    log.info(
      `[Application][handleExit] Process exit ${ProcessClose.SignalTerminate}`
    );
    shutdownGracefully(128 + 2);
  });

  process.on(ProcessClose.Exit, () => {
    log.info(`[Application][handleExit] Process exit ${ProcessClose.Exit}`);
  });

  const shutdownGracefully = (code: number): void => {
    try {
      process.exit(code);
    } catch (e) {
      log.error(
        `[Application][shutdownGracefully] Error during shut down ${e}`
      );
      process.exit(1);
    }
  };
}

void main();
