import type { MedicineItem } from '@/types';

export const filterMedicinesByName = (
  medicines: MedicineItem[],
  searchQuery: string,
): MedicineItem[] => {
  const normalizedSearchQuery = searchQuery.trim().normalize('NFC').toLocaleLowerCase('ko-KR');

  if (normalizedSearchQuery.length === 0) {
    return medicines;
  }

  return medicines.filter(medicine =>
    medicine.name.normalize('NFC').toLocaleLowerCase('ko-KR').includes(normalizedSearchQuery),
  );
};
