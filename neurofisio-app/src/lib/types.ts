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
}
