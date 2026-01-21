import { Patient } from './types';
import { subDays, subHours } from 'date-fns';

const now = new Date();

export const bedsData: Patient[] = [
    {
        bedNumber: '01',
        initials: 'M.S.',
        status: 'VNI',
        vmiStartDate: null,
        lastIMS: { target: 8, achieved: 7 },
        history: [
            {
                id: '1',
                date: subHours(now, 4),
                text: 'Paciente em VNI intermitente',
                metrics: 'SatO2 98%',
            },
        ],
        extubations: 1,
    },
    {
        bedNumber: '02',
        initials: 'J.P.',
        status: 'VMI',
        vmiStartDate: subDays(now, 12),
        lastIMS: { target: 4, achieved: 2 },
        history: [
            {
                id: '2',
                date: subHours(now, 2),
                text: 'Aspirado secreção espessa',
                metrics: 'Pico 25, PEEP 8',
            },
            {
                id: '3',
                date: subDays(now, 1),
                text: 'Tentativa de reduz sedação',
            },
        ],
        extubations: 0,
    },
    {
        bedNumber: '03',
        initials: '-',
        status: 'Vago',
        vmiStartDate: null,
        lastIMS: null,
        history: [],
        extubations: 0,
    },
    {
        bedNumber: '04',
        initials: 'A.C.',
        status: 'Desmame',
        vmiStartDate: subDays(now, 5),
        lastIMS: { target: 6, achieved: 5 },
        history: [
            {
                id: '4',
                date: subHours(now, 5),
                text: 'TRE iniciado pela manhã',
                metrics: 'Tobin 45',
            },
        ],
        extubations: 1,
    },
    {
        bedNumber: '05',
        initials: 'R.L.',
        status: 'Alta',
        vmiStartDate: null,
        lastIMS: { target: 10, achieved: 10 },
        history: [
            {
                id: '5',
                date: subHours(now, 1),
                text: 'Aguardando transporte',
            },
        ],
        extubations: 1,
    },
    {
        bedNumber: '06',
        initials: 'F.B.',
        status: 'VMI',
        vmiStartDate: subDays(now, 3),
        lastIMS: { target: 3, achieved: 1 },
        history: [
            {
                id: '6',
                date: subHours(now, 6),
                text: 'Intubação recente, sedado',
            },
        ],
        extubations: 0,
    },
    {
        bedNumber: '07',
        initials: '-',
        status: 'Vago',
        vmiStartDate: null,
        lastIMS: null,
        history: [],
        extubations: 0,
    },
    {
        bedNumber: '08',
        initials: 'L.M.',
        status: 'VNI',
        vmiStartDate: null,
        lastIMS: { target: 9, achieved: 8 },
        history: [
            {
                id: '7',
                date: subHours(now, 12),
                text: 'Boa tolerância à VNI noturna',
            },
        ],
        extubations: 2,
    },
    {
        bedNumber: '09',
        initials: 'P.H.',
        status: 'Desmame',
        vmiStartDate: subDays(now, 8),
        lastIMS: { target: 5, achieved: 4 },
        history: [
            {
                id: '8',
                date: subHours(now, 3),
                text: 'Progredindo sedestação',
            },
        ],
        extubations: 1,
    },
    {
        bedNumber: '10',
        initials: 'V.R.',
        status: 'VMI',
        vmiStartDate: subDays(now, 15),
        lastIMS: { target: 2, achieved: 1 },
        history: [
            {
                id: '9',
                date: subHours(now, 1),
                text: 'Troca de fixação TOT',
            },
        ],
        extubations: 0,
    },
];
