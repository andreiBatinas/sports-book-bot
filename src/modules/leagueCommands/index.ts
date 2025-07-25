import { getBot } from '../../botInit';
import {
  handleLeagues,
  leaguesHandleCallbackQuery,
  leaguesHandleMessage,
} from './leagueHandler';

export const setupLeagueCommands = () => {
  const bot = getBot();

  bot.onText(/\/leagues/, (msg, match) => handleLeagues(msg, match));

  bot.on('message', (msg) => leaguesHandleMessage(msg));
  bot.on('callback_query', (callbackQuery) =>
    leaguesHandleCallbackQuery(callbackQuery)
  );
};
