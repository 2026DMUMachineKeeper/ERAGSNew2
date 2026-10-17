export const COMPOUND_SCOPE_OPTIONS = [
  { id: 'LOCALIZED', label: '특정 부위에 있음' },
  { id: 'SYSTEMIC', label: '전신에 나타남' },
  { id: 'UNKNOWN', label: '범위를 확인하기 어려움' },
] as const;

export const COMPOUND_RELATION_OPTIONS = [
  { id: 'SAME', label: '같은 부위' },
  { id: 'DIFFERENT', label: '서로 다른 부위' },
  { id: 'NOT_APPLICABLE', label: '전신 증상이 포함되어 부위 비교 대상이 아님' },
  { id: 'UNKNOWN', label: '두 손상 부위의 관계를 잘 모르겠음' },
] as const;
