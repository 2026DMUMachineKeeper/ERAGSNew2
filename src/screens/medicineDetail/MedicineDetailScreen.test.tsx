import React from 'react';
import { Alert, Text, TextInput, TouchableOpacity } from 'react-native';

import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { invalidateMedicines } from '@/query';
import { MedicineDetailScreen } from '@/screens/MedicineDetailScreen';
import { fetchMedicineById, updateMedicine } from '@/services/medicineApi';

jest.mock('@/assets', () => ({ BackIcon: (): null => null }));
jest.mock('@/query', () => ({ invalidateMedicines: jest.fn() }));
jest.mock('@/services/medicineApi', () => ({
  fetchMedicineById: jest.fn(),
  updateMedicine: jest.fn(),
  deleteMedicine: jest.fn(),
}));

describe('약품 상세 편집 연결', () => {
  let renderer: ReactTestRenderer;

  afterEach((): void => {
    act((): void => renderer?.unmount());
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('분리된 수정 폼의 오류와 입력값을 저장 요청에 반영한다', async (): Promise<void> => {
    jest.spyOn(Alert, 'alert').mockImplementation((): void => {});
    jest.mocked(fetchMedicineById).mockResolvedValue({
      id: 'medicine-1',
      name: '기존 약품',
      efficacy: '기존 효능',
      usage: '기존 사용법',
      qty: 2,
      info: '',
      threshold: 0,
      barcode: null,
    });
    await act(async (): Promise<void> => {
      renderer = create(
        <MedicineDetailScreen
          navigation={{} as never}
          route={{ key: 'detail', name: 'MedicineDetail', params: { medicineId: 'medicine-1' } }}
        />,
      );
    });

    const pressButton = async (label: string): Promise<void> => {
      const button = renderer.root
        .findAllByType(TouchableOpacity)
        .find(candidate =>
          candidate.findAllByType(Text).some(textNode => textNode.props.children === label),
        );
      if (!button) {
        throw new Error(`버튼을 찾을 수 없습니다: ${label}`);
      }
      await act(async (): Promise<void> => {
        await button.props.onPress();
      });
    };
    await pressButton('수정');

    act((): void => {
      renderer.root
        .findAllByType(TextInput)
        .find(input => input.props.placeholder === '약 이름')
        ?.props.onChangeText('취소할 입력');
    });
    await pressButton('취소');
    await pressButton('수정');
    expect(
      renderer.root.findAllByType(TextInput).find(input => input.props.placeholder === '약 이름')
        ?.props.value,
    ).toBe('기존 약품');

    act((): void => {
      renderer.root
        .findAllByType(TextInput)
        .find(input => input.props.placeholder === '수량')
        ?.props.onChangeText('1.5');
    });
    await pressButton('저장');
    expect(updateMedicine).not.toHaveBeenCalled();
    expect(
      renderer.root
        .findAllByType(Text)
        .some(textNode => textNode.props.children === '수량은 0 이상의 정수로 입력해 주세요.'),
    ).toBe(true);

    act((): void => {
      renderer.root
        .findAllByType(TextInput)
        .find(input => input.props.placeholder === '수량')
        ?.props.onChangeText('0');
      renderer.root
        .findAllByType(TextInput)
        .find(input => input.props.placeholder === '약 이름')
        ?.props.onChangeText(' 수정한 약품 ');
    });
    await pressButton('저장');
    expect(updateMedicine).toHaveBeenCalledWith('medicine-1', {
      name: '수정한 약품',
      quantity: 0,
      efficacy: '기존 효능',
      usage: '기존 사용법',
    });
    expect(invalidateMedicines).toHaveBeenCalledTimes(1);
  });
});
