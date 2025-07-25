import { ethers } from 'ethers';

import { config } from '../config';

const url = config.arbitrum.rpcUrl;

export const provider = new ethers.providers.JsonRpcProvider(url);
