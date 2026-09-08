export interface ProfileValues {
  name: string;
  guardianPhone: string;
}

export interface SettingsProfileForm {
  values: ProfileValues;
  errors: { name: string | null; guardianPhone: string | null };
  isLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onNameChange: (nextName: string) => void;
  onGuardianPhoneChange: (nextPhone: string) => void;
}

export interface SettingsProfileState {
  form: SettingsProfileForm;
  loadError: string | null;
  onRetry: () => void;
}
