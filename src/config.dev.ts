export const config = {
  redis: {
    url: 'rediss://blabla1',
    prefix: {
      chatIdUserInfo: 'bot:user:chatid:',
      sportsBetsPrefix: 'cross:leagues:',
      marketBetPrefix: 'MB:',
      userFeesPrefix: 'fees:',
      userParlay: 'user:parlay:',
      parlayChoicePrefix: 'PC:',
      parlayAddDraft: 'PAD:',
    },
  },
  fees: {
    defaultFee: '1.50',
  },
  api: {
    url: 'http://localhost:9400',
  },
  telegram: {
    botToken: 'xxxxx',

  },
  arbitrum: {
    rpcUrl:
      'url',
    usdcAddress: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    parlayAmmAddress: '0x2Bb7D689780e7a34dD365359bD7333ab24903268',
  },
  private: {
    privateHeader: 'x-private',
    privateHeaderKey: 'afe77585-61aa-4ca7-9591-3df52cf6d',
  },
};
