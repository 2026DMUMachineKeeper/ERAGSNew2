export type AccidentType =
  | 'BLEEDING'
  | 'BURN'
  | 'FRACTURE_BRUISE'
  | 'FEVER'
  | 'SKIN_RASH'
  | 'AIRWAY_OBSTRUCTION'
  | 'FRACTURE'
  | 'CPR';
export type InputType = 'IMAGE' | 'VOICE' | 'MANUAL';
export type BleedingLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type Consciousness = 'CONSCIOUS' | 'UNCONSCIOUS' | 'UNKNOWN';
export type AgeGroup = 'CHILD' | 'ADULT' | 'ELDERLY';
export type BurnDegree = 'FIRST' | 'SECOND' | 'THIRD' | 'UNKNOWN';
export type FracturePattern =
  | 'SIMPLE_CLOSED'
  | 'OPEN'
  | 'COMPLETE'
  | 'COMMINUTED'
  | 'UNKNOWN';
export type TemperatureBand = 'UNDER_37_9' | '38_0_TO_38_9' | '39_PLUS';
export type RashType =
  | 'MACULAR'
  | 'VESICULAR'
  | 'ERYTHEMATOUS'
  | 'URTICARIAL'
  | 'UNKNOWN';
export type AirwayObstructionState =
  | 'PARTIAL'
  | 'COMPLETE_CONSCIOUS'
  | 'UNCONSCIOUS'
  | 'UNKNOWN';
export type RedFlagSignal =
  | 'UNCONTROLLED_BLEEDING'
  | 'SHOCK'
  | 'SPURTING_BLOOD'
  | 'DEEP_WOUND'
  | 'AMPUTATION'
  | 'EMBEDDED_OBJECT'
  | 'AIRWAY_BURN'
  | 'FACE_BURN'
  | 'LARGE_AREA_BURN'
  | 'CHEMICAL_BURN'
  | 'ELECTRICAL_BURN'
  | 'EXPOSED_BONE'
  | 'NEUROVASCULAR_SYMPTOM'
  | 'CRUSH_INJURY'
  | 'ALTERED_CONSCIOUSNESS'
  | 'RESPIRATORY_DISTRESS'
  | 'SEIZURE'
  | 'SEVERE_DEHYDRATION'
  | 'HIGH_RISK_AGE'
  | 'NON_BLANCHING_RASH'
  | 'FACIAL_SWELLING'
  | 'LIP_SWELLING'
  | 'WHEEZING'
  | 'HOARSE_VOICE'
  | 'CANNOT_SPEAK'
  | 'CANNOT_COUGH'
  | 'CANNOT_BREATHE'
  | 'CYANOSIS';

export interface AccidentClassification {
  type: AccidentType;
  confidence: number;
  rawInputType: InputType;
}

export interface PatientContext {
  bleedingLevel: BleedingLevel;
  consciousness: Consciousness;
  ageGroup: AgeGroup;
  burnDegree?: BurnDegree;
  fracturePattern?: FracturePattern;
  temperatureC?: number;
  temperatureBand?: TemperatureBand;
  rashType?: RashType;
  airwayObstructionState?: AirwayObstructionState;
  redFlagSignals?: RedFlagSignal[];
}

export interface EmergencyMlInput {
  accident: AccidentClassification;
  patientContext: PatientContext;
  transcript?: string;
  imageUri?: string;
  missingFields?: string[];
  source: 'AI' | 'KEYWORD' | 'MANUAL' | 'IMAGE';
}
