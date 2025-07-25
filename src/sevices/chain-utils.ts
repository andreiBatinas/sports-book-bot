import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

import { config } from '../config';
import { stablecoin } from '../infrastructure/abis/Stablecoin';
import { provider } from './arbitrum-provider';
import { getUserFees } from './userApi';

export const getUsdcAmountForAddress = async (address: string) => {
  const usdcContract = new ethers.Contract(
    config.arbitrum.usdcAddress,
    stablecoin.abi,
    provider
  );

  const fees = await getUserFees(address);
  const feesBn = new BigNumber(fees);

  const decimals = await usdcContract.decimals();
  const amount = await usdcContract.balanceOf(address);

  const divider = new BigNumber(10 ** decimals);
  const amountBn = new BigNumber(amount.toString()).dividedBy(divider);

  let amountAfterFees = amountBn.minus(feesBn);

  if (amountAfterFees.isNegative()) {
    return '0';
  }

  return amountAfterFees.toFixed(2, BigNumber.ROUND_DOWN);
};
