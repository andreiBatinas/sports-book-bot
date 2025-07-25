import { config } from '../../config';
import { Logger } from '../../infrastructure/logger';
import { Redis } from '../../infrastructure/redis';

interface State {
  [key: number]: any; // Assuming you can have any kind of data
}

interface LeagueBetState {
  chatId?: any;
}

export const parlaysBetData: State = {};
export const parlaysBetState: State = {};

export const ParlaysState = {
  AWAITING_AMOUNT: 'awaiting_amount',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
};

const log = new Logger('ParlaysState');

const cleanRedisParlayForUser = async (chatId: number) => {
  try {
    const pattern = `${config.redis.prefix.userParlay}${chatId}`;

    const key = await Redis.exists(pattern);

    if (key) {
      await Redis.del(pattern);
    }
  } catch (error: any) {
    log.error(`Error while removing key ${error.message}`);
  }
};

export const clearParlaysBetStates = async (chatId: number) => {
  parlaysBetData[chatId] = undefined;
  parlaysBetState[chatId] = undefined;

  // await cleanRedisParlayForUser(chatId);
};

export const clearParlay = async (chatId: number) => {
  clearParlaysBetStates(chatId);
  await cleanRedisParlayForUser(chatId);
};
