import BigNumber from 'bignumber.js';

export const toDecimalOdds = (ethOdds: string) => {
  const odds = new BigNumber(ethOdds)
    .dividedBy(1e18)
    .decimalPlaces(2, BigNumber.ROUND_DOWN);
  return new BigNumber(1).dividedBy(odds).toFixed(2, BigNumber.ROUND_DOWN);
};
