"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Mic, Trash2, Calendar, Activity, ChevronRight, Copy } from "lucide-react";
import { Patient } from "@/lib/types";
import { differenceInDays } from "date-fns";

interface BedTableProps {
    data: Patient[];
    onSelectPatient: (patient: Patient) => void;
    onClearPatient: (bedNumber: string) => void;
}

export function BedTable({ data, onSelectPatient, onClearPatient }: BedTableProps) {
    const calculateDaysVPM = (date: Date | null) => {
        if (!date) return "-";
        const days = differenceInDays(new Date(), new Date(date));
        return `${days} dias`;
    };

    const formatIMS = (lastIMS: Patient["lastIMS"]) => {
        if (!lastIMS) return "Não avaliado";
        return `${lastIMS.achieved} (Alvo: ${lastIMS.target})`;
    };

    const handleCopy = (bed: Patient) => {
        const daysVPMString = bed.vmiStartDate
            ? `${differenceInDays(new Date(), new Date(bed.vmiStartDate))} dias`
            : "0 dias";

        const text = `
Tempo VPM: ${daysVPMString}
IMS Alvo: ${bed.lastIMS?.target ?? "0"}
IMS Atingido: ${bed.lastIMS?.achieved ?? "0"}
Intercorrências: ${bed.extubations}
        `.trim();
        navigator.clipboard.writeText(text);
        alert("Indicadores copiados!");
    };

    return (
        <div className="space-y-4">
            {/* Mobile View: Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
                {data.map((bed) => (
                    <div
                        key={bed.bedNumber}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:scale-[0.98] transition-transform"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-bold text-slate-800">Leito {bed.bedNumber}</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400"
                                onClick={() => onSelectPatient(bed)}
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-4 ml-0.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {calculateDaysVPM(bed.vmiStartDate)} em VPM
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-100 flex items-center gap-2">
                                <Activity className="h-4 w-4 text-blue-500" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-blue-400 leading-tight">IMS</span>
                                    <span className="text-sm font-bold text-blue-700">{formatIMS(bed.lastIMS)}</span>
                                </div>
                            </div>
                            <div className="bg-purple-50/50 p-2 rounded-lg border border-purple-100 flex items-center gap-2">
                                <Mic className="h-4 w-4 text-purple-500" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-purple-400 leading-tight">Intercorr.</span>
                                    <span className="text-sm font-bold text-purple-700">{bed.extubations}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700 h-10 gap-2 font-bold"
                                onClick={() => onSelectPatient(bed)}
                            >
                                <Mic className="h-4 w-4" />
                                Gravar / Editar
                            </Button>
                            <Button
                                variant="outline"
                                className="w-12 h-10 p-0 text-blue-500 border-blue-200 hover:bg-blue-50"
                                onClick={() => handleCopy(bed)}
                                title="Copiar Indicadores"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="w-12 h-10 p-0 text-rose-500 border-rose-200 hover:bg-rose-50"
                                onClick={() => onClearPatient(bed.bedNumber)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50">
                            <TableHead className="w-[100px] font-bold text-slate-800">Leito</TableHead>
                            <TableHead className="font-bold text-slate-800">Dias VPM</TableHead>
                            <TableHead className="font-bold text-slate-800">IMS (Mobilidade)</TableHead>
                            <TableHead className="font-bold text-slate-800">Intercorrências</TableHead>
                            <TableHead className="text-right font-bold text-slate-800 pr-6">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((bed) => (
                            <TableRow
                                key={bed.bedNumber}
                                className="group hover:bg-blue-50/30 transition-colors"
                            >
                                <TableCell className="font-bold text-xl text-slate-700 py-4">
                                    {bed.bedNumber}
                                </TableCell>
                                <TableCell className="text-slate-600 font-medium">
                                    {calculateDaysVPM(bed.vmiStartDate)}
                                </TableCell>
                                <TableCell>
                                    {bed.lastIMS ? (
                                        <span className="text-xs">
                                            <span className="text-muted-foreground">Alvo:</span> {bed.lastIMS.target}
                                            <span className="text-muted-foreground mx-1">|</span>
                                            <span className="font-medium">Feito:</span> {bed.lastIMS.achieved}
                                        </span>
                                    ) : "-"}
                                </TableCell>
                                <TableCell className="text-slate-600 font-medium">
                                    {bed.extubations}
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700 font-medium"
                                            onClick={() => onSelectPatient(bed)}
                                        >
                                            <Mic className="h-4 w-4" />
                                            <span>Editar / Gravar</span>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 px-2 text-blue-500 border-blue-200 hover:bg-blue-50 font-medium"
                                            onClick={() => handleCopy(bed)}
                                            title="Copiar Indicadores"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 font-medium"
                                            onClick={() => onClearPatient(bed.bedNumber)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            <span>Limpar</span>
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
