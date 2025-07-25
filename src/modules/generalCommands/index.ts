import { getBot } from '../../botInit';
import {
  handleCallbackQuery,
  handleGlobalPositions,
  handleGlobalWinnings,
  handleHelpGlobal,
  handleStart,
} from './generalHelper';

export const setupGeneralComands = () => {
  const bot = getBot();

  bot.onText(/\/start/, (msg, match) => handleStart(msg, match));
  bot.onText(/\/help/, (msg, match) => handleHelpGlobal(msg, match));

  bot.onText(/\/positions/, (msg, match) => handleGlobalPositions(msg, match));
  bot.onText(/\/winnings/, (msg, match) => handleGlobalWinnings(msg, match));

  bot.on('callback_query', (callbackQuery) =>
    handleCallbackQuery(callbackQuery)
  );
};
