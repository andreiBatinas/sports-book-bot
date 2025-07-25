import axios from 'axios';
import BigNumber from 'bignumber.js';

import { getBot } from '../botInit';
import { config } from '../config';
import { Logger } from '../infrastructure/logger';
import { Redis } from '../infrastructure/redis';
import { getUsdcAmountForAddress } from './chain-utils';

const log = new Logger('UserApi');

export const createUserApi = async (chatId: number, log: Logger) => {
  let address = null;
  try {
    const url = `${config.api.url}/user/create`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;
    const res = await axios({
      method: 'post',
      url,
      data: { chatId },
      headers: { [privateHeader]: privateKey },
    });

    address = res.data.address;
  } catch (error: any) {
    log.error(`Error while creating user ${error.message}`);
  }

  return address;
};

export const getUserApi = async (chatId: number, log: Logger) => {
  let userInfo = null;
  try {
    const url = `${config.api.url}/user/info`;
    const privateHeader = config.private.privateHeader;
    const privateKey = config.private.privateHeaderKey;
    const res = await axios({
      method: 'post',
      url,
      data: { chatId },
      headers: { [privateHeader]: privateKey },
    });

    if (res.data.status === 'fail') {
      const address = await createUserApi(chatId, log);
      userInfo = {
        address: address,
        usdc: '0',
      };
      return userInfo;
    }

    userInfo = res.data.user;
  } catch (error: any) {
    log.error(`Error while getting user  ${error.message}`);
  }

  return userInfo;
};

export const getUserAddress = async (chatId: number, log: Logger) => {
  const userInfoKey = `${config.redis.prefix.chatIdUserInfo}:${chatId}`;
  const userInfoExists = await Redis.exists(userInfoKey);

  let userInfo = null;

  if (!userInfoExists) {
    userInfo = await getUserApi(chatId, log);
    if (!userInfo) {
      throw new Error(`Error while placing bet, please try again later`);
    }
    await Redis.setJSON(userInfoKey, userInfo);
  } else {
    userInfo = await Redis.getJSON(userInfoKey);
  }

  const address = userInfo.address;

  return address;
};

export const getUserWallet = async (chatId: number, log: Logger) => {
  const bot = getBot();
  const userInfoKey = `${config.redis.prefix.chatIdUserInfo}:${chatId}`;
  const userInfoExists = await Redis.exists(userInfoKey);
  let userInfo = null;

  if (!userInfoExists) {
    userInfo = await getUserApi(chatId, log);
    if (!userInfo) {
      log.error(
        `Error trying to run /start, userinfo null, cannot reach server`
      );
      await bot.sendMessage(
        chatId,
        '❌ Error: Please try again or contact support if issue persists'
      );
      throw new Error('not user info available');
    }
    await Redis.setJSON(userInfoKey, userInfo);
  } else {
    userInfo = await Redis.getJSON(userInfoKey);
  }

  const address = userInfo.address;
  const usdcAmount = await getUsdcAmountForAddress(address);

  return {
    address,
    usdcAmount,
  };
};

export const getUserFees = async (address: string) => {
  let fees = '0';
  try {
    const userFeesKey = `${config.redis.prefix.userFeesPrefix}${address}`;
    const userFeesExist = await Redis.exists(userFeesKey);

    if (!userFeesExist) {
      return fees;
    }

    const userFees = await Redis.getJSON(userFeesKey);

    fees = userFees.fees;
  } catch (error: any) {
    log.error(`Error while getting user fees ${error.message}`);
  }

  return fees;
};

export const addDefaultFeeToUser = async (address: string) => {
  try {
    const userFeesKey = `${config.redis.prefix.userFeesPrefix}${address}`;
    const userFeesExist = await Redis.exists(userFeesKey);

    if (!userFeesExist) {
      throw new Error('fees object doesnt exist');
    }

    const userFees = await Redis.getJSON(userFeesKey);
    const fees = new BigNumber(userFees.fees);
    const newCumulatedFees = fees.plus(config.fees.defaultFee);

    await Redis.setJSON(userFeesKey, {
      fees: newCumulatedFees.toString(),
    });
  } catch (error: any) {
    log.error(`Error while adding to user fees ${error.message}`);
  }
};

export const addParlayFeeToUser = async (address: string) => {
  try {
    const userFeesKey = `${config.redis.prefix.userFeesPrefix}${address}`;
    const userFeesExist = await Redis.exists(userFeesKey);

    if (!userFeesExist) {
      throw new Error('fees object doesnt exist');
    }

    const userFees = await Redis.getJSON(userFeesKey);
    const fees = new BigNumber(userFees.fees);
    const newCumulatedFees = fees.plus(config.fees.parlayFee);

    await Redis.setJSON(userFeesKey, {
      fees: newCumulatedFees.toString(),
    });
  } catch (error: any) {
    log.error(`Error while adding to user fees ${error.message}`);
  }
};
