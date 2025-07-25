import { config } from '../../config';
import { Logger } from '../../infrastructure/logger';
import { Redis } from '../../infrastructure/redis';

interface State {
  [key: number]: any; // Assuming you can have any kind of data
}

interface LeagueBetState {
  chatId?: any;
}

export const leagueBetData: State = {};
export const leagueBetState: State = {};

export const LeagueBetState = {
  AWAITING_AMOUNT: 'awaiting_amount',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
};

const log = new Logger('LeagueState');

const cleanRedisLeagueForUser = async (chatId: number) => {
  try {
    const pattern = `${config.redis.prefix.marketBetPrefix}${chatId}:*`;

    const keys = await Redis.keys(pattern);

    const result = keys.map(async (key) => {
      await Redis.del(key);
    });

    await Promise.all(result);
  } catch (error: any) {
    log.error(`Error while removing key ${error.message}`);
  }
};

export const clearLeagueBetStates = async (chatId: number) => {
  leagueBetData[chatId] = undefined;
  leagueBetState[chatId] = undefined;

  await cleanRedisLeagueForUser(chatId);
};
