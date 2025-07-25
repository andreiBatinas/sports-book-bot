export const config = {
  redis: {
    url: 'rediss://dedsdsdsdb.ondigitalocean.com:25061',
    prefix: {
      chatIdUserInfo: 'bot:user:chatid:',
      sportsBetsPrefix: 'cross:leagues:',
      marketBetPrefix: 'MB:',
      userFeesPrefix: 'fees:',
    },
  },
  fees: {
    defaultFee: '1.50',
  },
  api: {
    url: 'http://api-service:80',
  },
  telegram: {
    botToken: 'xsxsxsxs:dsdsdsdsxs',
  },
  arbitrum: {
    rpcUrl:
      'https://arb-mainnet.g.alchemy.com/v2/z-11111',
    usdcAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  },
  private: {
    privateHeader: 'x-private',
    privateHeaderKey: 'afe77585-61aa-4ca7-9591-3df52cf6d',
  },
};
