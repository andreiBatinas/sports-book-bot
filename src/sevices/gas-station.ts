import { ethers } from 'ethers';

export const getFeeObject = async (provider: any) => {
  const block = await provider.getBlock('latest');
  if (block === undefined || block === null) {
    return null;
  }

  if (block.baseFeePerGas === undefined || block.baseFeePerGas === null) {
    return null;
  }
  const block_number = block.number;
  const base_fee = parseFloat(
    ethers.utils.formatUnits(block.baseFeePerGas, 'gwei')
  );

  const max_priority_fee_hex = await provider.send(
    'eth_maxPriorityFeePerGas',
    []
  );
  const max_priority_fee_wei =
    ethers.BigNumber.from(max_priority_fee_hex).toNumber();
  const max_priority_fee = parseFloat(
    ethers.utils.formatUnits(max_priority_fee_wei, 'gwei')
  );

  let max_fee_per_gas = base_fee + max_priority_fee;

  //  In case the network gets (up to 25%) more congested
  max_fee_per_gas += base_fee * 0.25;

  //  cast gwei numbers to wei BigNumbers for ethers
  const maxFeePerGas = ethers.utils.parseUnits(
    max_fee_per_gas.toFixed(9),
    'gwei'
  );
  const maxPriorityFeePerGas = ethers.utils.parseUnits(
    max_priority_fee.toFixed(9),
    'gwei'
  );

  //  Final object ready to feed into a transaction
  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
};
