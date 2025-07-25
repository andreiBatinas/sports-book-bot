export const config = {
  redis: {
    url: 'rediss://',
    prefix: {
      chatIdUserInfo: 'bot:user:chatid:',
      sportsBetsPrefix: 'cross:leagues:',
      marketBetPrefix: 'MB:',
      userFeesPrefix: 'fees:',
      userParlay: 'user:parlay:',
      parlayChoicePrefix: 'PC:',
      parlayAddDraft: 'PAD:',
    },
    sportsGlobalId: 'global:id',
  },
  fees: {
    defaultFee: '1.50',
    parlayFee: '3',
  },
  api: {
    url: 'http://api-service',
  },
  telegram: {
    botToken: '11111',
  },
  arbitrum: {
    rpcUrl:
      'https://arb-mainnet.g.alchemy.com/v2/z-112312312',
    usdcAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    parlayAmmAddress: '0x2Bb7D689780e7a34dD365359bD7333ab24903268',
  },
  private: {
    privateHeader: 'x-private',
    privateHeaderKey: 'afe77585-61aa-4ca7-9591-3df52cf6d',
  },
};
