import type { MedicineItem } from '@/services/medicineApi';

import { filterMedicinesByName } from './MedicineMemoScreen';

jest.mock('../assets', () => ({
  BackIcon: (): null => null,
}));

const MEDICINES: MedicineItem[] = [
  {
    id: '1',
    name: '타이레놀',
    info: '',
    qty: 2,
    threshold: 0,
    barcode: null,
    usage: '',
    efficacy: '',
  },
  {
    id: '2',
    name: 'Tylenol',
    info: '',
    qty: 1,
    threshold: 0,
    barcode: null,
    usage: '',
    efficacy: '',
  },
  {
    id: '3',
    name: '게보린',
    info: '',
    qty: 3,
    threshold: 0,
    barcode: null,
    usage: '',
    efficacy: '',
  },
];

describe('filterMedicinesByName', () => {
  it('공백과 영문 대소문자를 무시하고 약품명으로 검색한다', (): void => {
    expect(filterMedicinesByName(MEDICINES, ' 타이 ')).toEqual([MEDICINES[0]]);
    expect(filterMedicinesByName(MEDICINES, 'TYL')).toEqual([MEDICINES[1]]);
    expect(filterMedicinesByName(MEDICINES, '  ')).toBe(MEDICINES);
  });
});
