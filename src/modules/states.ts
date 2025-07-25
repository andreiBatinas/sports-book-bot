import { clearLeagueBetStates } from './leagueCommands/leagueState';
import { clearParlaysBetStates } from './parlaysCommands/parlaysState';
import { clearWalletStates } from './walletCommands/walletState';

export const clearAllStates = (chatId: number) => {
  clearLeagueBetStates(chatId);
  clearWalletStates(chatId);
  clearParlaysBetStates(chatId);
};
