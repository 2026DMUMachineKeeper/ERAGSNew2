import { FIRST_AID_CATEGORIES } from './firstAidData';

describe('FIRST_AID_CATEGORIES', () => {
  it('요청된 6개 유형과 세부 항목을 제공한다', () => {
    expect(FIRST_AID_CATEGORIES).toEqual([
      { id: 'bleeding', label: '출혈', subtypes: ['경미', '일반', '과다'] },
      { id: 'burn', label: '화상', subtypes: ['1도', '2도', '3도'] },
      {
        id: 'fractureBruise',
        label: '골절/타박상',
        subtypes: ['단순 폐쇄성', '개방성', '완전', '분쇄'],
      },
      { id: 'fever', label: '발열', subtypes: ['~37.9', '~38.9', '39~'] },
      {
        id: 'skinRash',
        label: '피부 발진',
        subtypes: ['반점형', '수포성', '홍반성', '두드러기'],
      },
      { id: 'airwayObstruction', label: '기도 폐쇄', subtypes: [] },
    ]);
  });
});
