import { getBot } from '../../botInit';
import {
  handleGlobalParlays,
  parlaysHandleCallbackQuery,
} from './parlayHandler';

export const setupParlayCommands = () => {
  const bot = getBot();

  bot.onText(/\/parlays/, (msg, match) => handleGlobalParlays(msg, match));

  // bot.on('message', (msg) => walletHandleMessage(msg));
  bot.on('callback_query', (callbackQuery) =>
    parlaysHandleCallbackQuery(callbackQuery)
  );
};
