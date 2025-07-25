import { getBot } from '../../botInit';
import {
  handleCallbackQuery,
  handlePreferences,
  preferencesHandleMessage,
} from './preferenceHandler';

export const setupPreferencesCommands = () => {
  const bot = getBot();

  bot.onText(/\/preference/, (msg, match) => handlePreferences(msg));

  bot.on('message', (msg) => preferencesHandleMessage(msg));
  bot.on('callback_query', (callbackQuery) =>
    handleCallbackQuery(callbackQuery)
  );
};
