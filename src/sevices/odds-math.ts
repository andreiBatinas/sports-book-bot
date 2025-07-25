export const decimalToAmerican = (decimalOdds: number): string => {
  if (decimalOdds > 2) {
    return `+${Math.round((decimalOdds - 1) * 100)}`;
  } else if (decimalOdds === 2) {
    return '+100';
  } else if (decimalOdds < 2 && decimalOdds > 1) {
    return `${Math.round(-100 / (decimalOdds - 1))}`;
  } else if (decimalOdds === 1) {
    return '+0';
  } else {
    // Handle invalid odds
    return 'Invalid odds';
  }
};
