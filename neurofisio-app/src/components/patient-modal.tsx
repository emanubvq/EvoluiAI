"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Activity, Calendar, X, Square, Loader2 } from "lucide-react";
import { Patient } from "@/lib/types";
import { StatusBadge } from "./status-badge";
import { differenceInDays, formatDistanceToNow, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { AudioRecorder } from "./audio-recorder";
import { sendAudioToN8n } from "@/lib/n8n-service";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "./ui/label";
import { Pencil, Save } from "lucide-react";

interface PatientModalProps {
    patient: Patient | null;
    isOpen: boolean;
    onClose: () => void;
    onClearPatient: (bedNumber: string) => void;
    onSuccessfulUpdate?: () => Promise<void>;
}

export function PatientModal({ patient, isOpen, onClose, onClearPatient, onSuccessfulUpdate }: PatientModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        initials: "",
        imsTarget: 0,
        imsAchieved: 0,
        daysOnVm: 0,
        extubations: 0
    });

    const daysVPM = patient?.vmiStartDate
        ? differenceInDays(new Date(), new Date(patient.vmiStartDate))
        : 0;

    useEffect(() => {
        if (patient) {
            setFormData({
                initials: patient.initials || "-",
                imsTarget: patient.lastIMS?.target || 0,
                imsAchieved: patient.lastIMS?.achieved || 0,
                daysOnVm: daysVPM,
                extubations: patient.extubations || 0
            });
            setIsEditing(false);
        }
    }, [patient, daysVPM]);

    if (!patient) return null;

    const handleManualSave = async () => {
        setIsProcessing(true);
        try {
            const vmiStart = subDays(new Date(), formData.daysOnVm);
            const { error } = await supabase
                .from("patients")
                .update({
                    last_ims: {
                        target: Number(formData.imsTarget),
                        achieved: Number(formData.imsAchieved)
                    },
                    extubations: Number(formData.extubations),
                    vmi_start_date: vmiStart.toISOString(),
                })
                .eq("bed_number", patient.bedNumber);

            if (error) throw error;

            alert("Dados salvos com sucesso!");
            setIsEditing(false);
            if (onSuccessfulUpdate) await onSuccessfulUpdate();
        } catch (error) {
            console.error("Save error:", error);
            alert("Erro ao salvar dados.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRecordingComplete = async (audioBlob: Blob) => {
        setIsProcessing(true);
        try {
            const n8nData = await sendAudioToN8n(audioBlob, patient.bedNumber);
            const vmiStart = subDays(new Date(), n8nData.days_on_vm);

            const { error } = await supabase
                .from("patients")
                .update({
                    last_ims: {
                        target: n8nData.ims_target,
                        achieved: n8nData.ims_achieved
                    },
                    extubations: n8nData.extubations,
                    vmi_start_date: vmiStart.toISOString(),
                    history: [
                        {
                            id: crypto.randomUUID(),
                            date: new Date().toISOString(),
                            text: n8nData.transcription,
                            metrics: `IMS: ${n8nData.ims_achieved}/${n8nData.ims_target}`
                        },
                        ...(patient.history || [])
                    ]
                })
                .eq("bed_number", patient.bedNumber);

            if (error) throw error;

            alert("Atualizado com sucesso!");
            if (onSuccessfulUpdate) await onSuccessfulUpdate();
            onClose();
        } catch (error) {
            console.error("Integration error:", error);
            alert("Erro ao processar áudio.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopyData = () => {
        const text = `
Tempo VPM: ${patient.vmiStartDate ? daysVPM : "0"} dias
IMS Alvo: ${patient.lastIMS?.target ?? "0"}
IMS Atingido: ${patient.lastIMS?.achieved ?? "0"}
Intercorrências: ${patient.extubations}
        `.trim();
        navigator.clipboard.writeText(text);
        alert("Indicadores copiados!");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg md:max-w-2xl bg-white p-4 md:p-6 rounded-t-xl sm:rounded-xl">
                <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
                    <div className="flex items-center gap-3">
                        <DialogTitle className="text-xl md:text-2xl font-bold text-slate-800">
                            Leito {patient.bedNumber}
                        </DialogTitle>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(!isEditing)}
                            className={`h-9 px-3 gap-1.5 text-xs font-semibold ${isEditing ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline">{isEditing ? "Visualizar" : "Editar"}</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyData}
                            className="h-9 px-3 gap-1.5 text-xs font-semibold"
                        >
                            <Mic className="h-3.5 w-3.5" />
                            <span className="hidden xs:inline">Copiar</span>
                        </Button>
                    </div>
                </DialogHeader>

                {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="daysOnVm" className="text-xs uppercase font-bold text-slate-500">Dias em VPM</Label>
                            <Input
                                id="daysOnVm"
                                type="number"
                                inputMode="numeric"
                                value={formData.daysOnVm}
                                onChange={(e) => setFormData({ ...formData, daysOnVm: Number(e.target.value) })}
                                className="bg-slate-50 h-11"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="imsTarget" className="text-xs uppercase font-bold text-slate-500">IMS Alvo</Label>
                            <Input
                                id="imsTarget"
                                type="number"
                                inputMode="numeric"
                                value={formData.imsTarget}
                                onChange={(e) => setFormData({ ...formData, imsTarget: Number(e.target.value) })}
                                className="bg-slate-50 h-11"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="imsAchieved" className="text-xs uppercase font-bold text-slate-500">IMS Atingido</Label>
                            <Input
                                id="imsAchieved"
                                type="number"
                                inputMode="numeric"
                                value={formData.imsAchieved}
                                onChange={(e) => setFormData({ ...formData, imsAchieved: Number(e.target.value) })}
                                className="bg-slate-50 h-11"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="extubations" className="text-xs uppercase font-bold text-slate-500">Extubações</Label>
                            <Input
                                id="extubations"
                                type="number"
                                inputMode="numeric"
                                value={formData.extubations}
                                onChange={(e) => setFormData({ ...formData, extubations: Number(e.target.value) })}
                                className="bg-slate-50 h-11"
                            />
                        </div>
                        <div className="md:col-span-2 flex justify-end pt-4">
                            <Button onClick={handleManualSave} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 w-full h-12 text-base font-bold">
                                {isProcessing ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <Save className="mr-2 h-5 w-5" />}
                                Salvar Alterações
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 pt-4">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-slate-500 text-[10px] font-bold uppercase mb-1">Dias em VPM</span>
                                <div className="flex items-baseline gap-1">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    <span className="text-xl md:text-2xl font-bold text-slate-800">{patient.vmiStartDate ? daysVPM : "-"}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-slate-500 text-[10px] font-bold uppercase mb-1">IMS Alvo</span>
                                <div className="flex items-baseline gap-1">
                                    <Activity className="h-4 w-4 text-blue-400" />
                                    <span className="text-xl md:text-2xl font-bold text-slate-800">{patient.lastIMS?.target ?? "-"}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-slate-500 text-[10px] font-bold uppercase mb-1">IMS Atingido</span>
                                <div className="flex items-baseline gap-1">
                                    <Activity className="h-4 w-4 text-emerald-500" />
                                    <span className="text-xl md:text-2xl font-bold text-emerald-700">{patient.lastIMS?.achieved ?? "-"}</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="text-slate-500 text-[10px] font-bold uppercase mb-1">Extub.</span>
                                <div className="flex items-baseline gap-1">
                                    <Mic className="h-4 w-4 text-purple-500" />
                                    <span className="text-xl md:text-2xl font-bold text-slate-800">{patient.extubations}</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pb-2">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Histórico Recente</h3>
                            <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                {patient.history.length > 0 ? (
                                    patient.history.slice(0, 5).map((log) => (
                                        <div key={log.id} className="text-sm border-l-2 border-slate-200 pl-3 py-1 bg-slate-50/50 rounded-r-lg">
                                            <div className="flex justify-between items-start">
                                                <span className="font-medium text-slate-700 leading-snug">{log.text}</span>
                                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2 mt-0.5">
                                                    {formatDistanceToNow(new Date(log.date), { addSuffix: true, locale: ptBR })}
                                                </span>
                                            </div>
                                            {log.metrics && <p className="text-slate-500 text-[10px] font-bold mt-1 tracking-tight">{log.metrics}</p>}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Nenhum registro recente.</p>
                                )}
                            </div>
                        </div>

                        <div className="py-6 flex justify-center border-t">
                            <AudioRecorder
                                onRecordingComplete={handleRecordingComplete}
                                isSending={isProcessing}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter className="flex flex-row gap-2 border-t pt-4 mt-0">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            if (confirm("Deseja limpar os dados deste leito?")) {
                                onClearPatient(patient.bedNumber);
                            }
                        }}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex-1 h-11"
                    >
                        Limpar Leito
                    </Button>
                    <Button type="button" variant="secondary" onClick={onClose} className="flex-1 h-11">
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
