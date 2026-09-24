import React from 'react';
import { Alert, Text, TextInput, TouchableOpacity } from 'react-native';

import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { invalidateMedicines } from '@/query';
import { MedicineManualInputScreen } from '@/screens/MedicineManualInputScreen';
import { postMedicineManual } from '@/services/medicineApi';

jest.mock('@/query', () => ({ invalidateMedicines: jest.fn() }));
jest.mock('@/services/medicineApi', () => ({ postMedicineManual: jest.fn() }));

describe('약품 수동 입력 연결', () => {
  let renderer: ReactTestRenderer;

  afterEach((): void => {
    act((): void => renderer?.unmount());
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('필수 입력 검증과 수량 변경을 거쳐 폼 값을 등록한다', async (): Promise<void> => {
    jest.spyOn(Alert, 'alert').mockImplementation((): void => {});
    await act(async (): Promise<void> => {
      renderer = create(<MedicineManualInputScreen navigation={{} as never} route={{} as never} />);
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
    await pressButton('저장');
    expect(postMedicineManual).not.toHaveBeenCalled();
    expect(
      renderer.root
        .findAllByType(Text)
        .some(textNode => textNode.props.children === '약 이름을 입력해 주세요.'),
    ).toBe(true);

    const inputs = renderer.root.findAllByType(TextInput);
    expect(inputs[2].props.maxLength).toBe(200);
    expect(inputs[3].props.maxLength).toBe(300);
    act((): void => {
      inputs[0].props.onChangeText(' 새 약품 ');
      inputs[1].props.onChangeText('2026-10-15');
      inputs[2].props.onChangeText('효능');
      inputs[3].props.onChangeText('사용법');
    });
    await pressButton('-');
    await pressButton('+');
    await pressButton('저장');
    expect(postMedicineManual).toHaveBeenCalledWith({
      name: '새 약품',
      efficacy: '효능',
      usage: '사용법',
      quantityToAdd: 2,
      expire_date: '2026-10-15',
    });
    expect(invalidateMedicines).toHaveBeenCalledTimes(1);
  });
});
