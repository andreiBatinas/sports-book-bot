import { ParlayPosition } from '../modules/parlaysCommands/parlay.types';

export const addOrUpdatePosition = (
  positions: ParlayPosition[],
  newPosition: ParlayPosition
): ParlayPosition[] => {
  const positionMap: { [parentAddress: string]: ParlayPosition } = {};

  // Loop through the existing positions and create a map with contract as key
  positions.forEach((position) => {
    positionMap[position.parentAddress] = position;
  });

  // Add or update the position in the map
  positionMap[newPosition.parentAddress] = newPosition;

  // Convert the map back to an array
  return Object.values(positionMap);
};
