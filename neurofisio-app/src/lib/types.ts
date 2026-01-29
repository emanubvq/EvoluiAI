export type PatientStatus = 'VMI' | 'Desmame' | 'VNI' | 'Alta' | 'Vago';

export interface IMSData {
  target: number;
  achieved: number;
}

export interface HistoryLog {
  id: string;
  date: Date;
  text: string;
  metrics?: string;
}

export interface Patient {
  bedNumber: string;
  initials: string;
  status: PatientStatus;
  vmiStartDate: Date | null;
  lastIMS: IMSData | null;
  history: HistoryLog[];
  extubations: number;
  extubationSuccess: number;
  extubationFail: number;
  extubationAccidental: number;
  extubationSelf: number;
  lastGeneratedRecord?: string | null;
}

export interface DailyMetrics {
  id: string;
  date: string;
  bed_number: string;
  ims_target: number;
  ims_achieved: number;
  has_mv: boolean;
}

export interface PatientDischarge {
  id: string;
  discharge_date: string;
  bed_number: string;
  mv_duration_days: number;
  extubation_success_count: number;
  extubation_fail_count: number;
  extubation_accidental_count: number;
  extubation_self_count: number;
}
