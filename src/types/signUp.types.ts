import type { AuthRequest } from './auth.types';

export interface SignUpValues {
  name: string;
  email: string;
  guardianPhoneNumber: string;
  password: string;
  passwordConfirm: string;
}

export interface SignUpErrors {
  name: string | null;
  email: string | null;
  guardianPhoneNumber: string | null;
}

export interface SignUpValidationResult {
  request: AuthRequest | null;
  errors: Partial<SignUpErrors>;
  alert?: { title: string; message: string };
}

export interface SignUpFormState {
  values: SignUpValues;
  errors: SignUpErrors;
  isSubmitting: boolean;
  handleChange: (field: keyof SignUpValues, nextText: string) => void;
  handleSubmit: () => Promise<void>;
}
