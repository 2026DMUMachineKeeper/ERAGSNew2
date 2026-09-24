import type { TextInputProps } from 'react-native';

export interface MedicineEditValidationErrors {
  name: string | null;
  efficacy: string | null;
  usage: string | null;
  quantity: string | null;
  expireDate: string | null;
}

export interface MedicineEditValues {
  name: string;
  efficacy: string;
  usage: string;
  quantity: string;
  expireDate: string;
}

export interface MedicineManualInputErrors {
  name: string | null;
  efficacy: string | null;
  usage: string | null;
  expireDate: string | null;
}

export interface MedicineManualInputValues {
  name: string;
  efficacy: string;
  usage: string;
  expireDate: string;
}

export interface MedicineEditor {
  isEditOpen: boolean;
  isSaving: boolean;
  values: MedicineEditValues;
  errors: MedicineEditValidationErrors;
  onChange: (field: keyof MedicineEditValues, nextText: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export interface MedicineDetailState {
  medicine: MedicineItem | null;
  isLoading: boolean;
  loadError: string | null;
  isDeleting: boolean;
  editor: MedicineEditor;
  handleOpenEdit: () => void;
  handleConfirmDelete: () => void;
}

export interface MedicineManualFormState {
  values: MedicineManualInputValues;
  quantity: number;
  errors: MedicineManualInputErrors;
  onChange: (field: keyof MedicineManualInputValues, nextText: string) => void;
  onIncreaseQuantity: () => void;
  onDecreaseQuantity: () => void;
}

export interface MedicineManualInputState {
  form: MedicineManualFormState;
  isSaving: boolean;
  handleClose: () => void;
  handleSave: () => Promise<void>;
}

export interface MedicinePhotoState {
  isUploading: boolean;
  isSavingExpiry: boolean;
  registeredMedicineName: string | null;
  expireDate: string;
  expireDateError: string | null;
  handleClose: () => void;
  handleOpenCamera: () => Promise<void>;
  handleExpireDateChange: (nextText: string) => void;
  handleConfirmRegistration: () => Promise<void>;
  handleRegisterWithoutExpiry: () => Promise<void>;
}

export interface MedicineFormFieldConfig {
  label: string;
  containerClassName: string;
  labelClassName: string;
  innerInputClassName?: string;
  inputClassName: string;
  errorInputClassName: string;
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText'>;
  hasCharacterCount?: boolean;
  isOptional?: boolean;
}

export interface MedicineItem {
  id: string;
  name: string;
  info: string;
  qty: number;
  threshold: number;
  barcode: string | null;
  usage: string;
  efficacy: string;
  expireDate?: string | null;
}

export interface MedicineAlert extends MedicineItem {
  isLowStock: boolean;
  isExpiringSoon: boolean;
  isExpired: boolean;
}
