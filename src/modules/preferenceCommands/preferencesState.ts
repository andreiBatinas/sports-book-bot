interface State {
  [key: number]: any; // Assuming you can have any kind of data
}

interface PreferencesState {
  chatId?: any;
}

export const preferencesState: State = {};
export const preferencesData: State = {};

export const PreferencesState = {
  AWAITING_ADDRESS: 'awaiting_address',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
};

export const clearPreferencesStates = (chatId: number) => {
  preferencesState[chatId] = undefined;
  preferencesData[chatId] = undefined;
};
