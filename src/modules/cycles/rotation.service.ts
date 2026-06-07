import type { GroupDocument, GroupMember } from '../groups/group.model';

const shuffleMembers = (members: GroupMember[]): GroupMember[] => {
  const shuffled = [...members];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled.map((member, index) => ({
    ...member,
    slotPosition: index + 1
  }));
};

export const lockRotationOrder = (group: GroupDocument): void => {
  if (group.rotationOrder === 'random') {
    group.members = shuffleMembers(group.members);
    return;
  }

  group.members = [...group.members].sort((left, right) => left.slotPosition - right.slotPosition);
};

export const getRecipientForCycle = (group: GroupDocument, cycleNumber: number): GroupMember | undefined =>
  group.members.find((member) => member.slotPosition === cycleNumber);
