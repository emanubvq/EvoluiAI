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
import { differenceInCalendarDays, formatDistanceToNow, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { AudioRecorder } from "./audio-recorder";
import { sendAudioToN8n } from "@/lib/n8n-service";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "./ui/label";
import { Pencil, Save, FileText, Copy as CopyIcon, Syringe } from "lucide-react";
import { Textarea } from "./ui/textarea";

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
    const [isEditingRecord, setIsEditingRecord] = useState(false);
    const [formData, setFormData] = useState({
        initials: "",
        imsTarget: 0,
        imsAchieved: 0,
        vmiStartDate: "",
        extubations: 0,
        extubationSuccess: 0,
        extubationFail: 0,
        extubationAccidental: 0,
        extubationSelf: 0
    });
    const [editedRecord, setEditedRecord] = useState("");

    const daysVPM = patient?.vmiStartDate
        ? differenceInCalendarDays(new Date(), new Date(patient.vmiStartDate))
        : 0;

    useEffect(() => {
        if (patient) {
            setFormData({
                initials: patient.initials || "-",
                imsTarget: patient.lastIMS?.target || 0,
                imsAchieved: patient.lastIMS?.achieved || 0,
                vmiStartDate: patient.vmiStartDate ? format(new Date(patient.vmiStartDate), "yyyy-MM-dd") : "",
                extubations: patient.extubations || 0,
                extubationSuccess: patient.extubationSuccess || 0,
                extubationFail: patient.extubationFail || 0,
                extubationAccidental: patient.extubationAccidental || 0,
                extubationSelf: patient.extubationSelf || 0
            });
            setEditedRecord(patient.lastGeneratedRecord || "");
            setIsEditing(false);
            setIsEditingRecord(false);
        }
    }, [patient]);

    if (!patient) return null;

    const handleManualSave = async () => {
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from("patients")
                .update({
                    last_ims: {
                        target: Number(formData.imsTarget),
                        achieved: Number(formData.imsAchieved)
                    },
                    extubations: Number(formData.extubations),
                    extubation_success_count: Number(formData.extubationSuccess),
                    extubation_fail_count: Number(formData.extubationFail),
                    extubation_accidental_count: Number(formData.extubationAccidental),
                    extubation_self_count: Number(formData.extubationSelf),
                    vmi_start_date: formData.vmiStartDate ? new Date(formData.vmiStartDate + "T00:00:00").toISOString() : null,
                })
                .eq("bed_number", patient.bedNumber);

            if (error) throw error;

            // Upsert to daily_metrics
            const today = new Date().toISOString().split('T')[0];
            const { error: metricsError } = await supabase
                .from("daily_metrics")
                .upsert({
                    date: today,
                    bed_number: patient.bedNumber,
                    ims_target: Number(formData.imsTarget),
                    ims_achieved: Number(formData.imsAchieved),
                    has_mv: !!formData.vmiStartDate
                }, { onConflict: 'date, bed_number' });

            if (metricsError) console.error("Error saving daily metrics:", metricsError);

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
            const n8nData = await sendAudioToN8n(audioBlob);

            // Prepare update data
            const updateData: any = {
                last_generated_record: n8nData.formatted_record,
            };

            // If metadata is provided, update structured fields too
            if (n8nData.metadata) {
                if (n8nData.metadata.ims_target !== undefined && n8nData.metadata.ims_achieved !== undefined) {
                    updateData.last_ims = {
                        target: n8nData.metadata.ims_target,
                        achieved: n8nData.metadata.ims_achieved
                    };
                }
                if (n8nData.metadata.extubations !== undefined) {
                    updateData.extubations = n8nData.metadata.extubations;
                }
            }

            // AUTOMATION: If this is the first recording for a patient, set vmi_start_date and status
            if (!patient.vmiStartDate) {
                updateData.vmi_start_date = new Date().toISOString();
                updateData.status = "Ocupado";
            }

            const { error } = await supabase
                .from("patients")
                .update(updateData)
                .eq("bed_number", patient.bedNumber);

            if (error) throw error;

            alert("Prontuário gerado com sucesso!");
            if (onSuccessfulUpdate) await onSuccessfulUpdate();
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

    const handleCopyRecord = () => {
        if (patient.lastGeneratedRecord) {
            navigator.clipboard.writeText(patient.lastGeneratedRecord);
            alert("Prontuário copiado!");
        }
    };

    const handleSaveEditedRecord = async () => {
        setIsProcessing(true);
        try {
            const { error } = await supabase
                .from("patients")
                .update({ last_generated_record: editedRecord })
                .eq("bed_number", patient.bedNumber);

            if (error) throw error;

            alert("Prontuário atualizado!");
            setIsEditingRecord(false);
            if (onSuccessfulUpdate) await onSuccessfulUpdate();
        } catch (error) {
            console.error("Error saving record:", error);
            alert("Erro ao salvar prontuário.");
        } finally {
            setIsProcessing(false);
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-lg md:max-w-2xl bg-white p-0 md:p-0 rounded-t-xl sm:rounded-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="overflow-y-auto p-4 md:p-6 flex-1 custom-scrollbar">
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
                                <Label htmlFor="vmiStartDate" className="text-xs uppercase font-bold text-slate-500">Data de Intubação</Label>
                                <Input
                                    id="vmiStartDate"
                                    type="date"
                                    value={formData.vmiStartDate}
                                    onChange={(e) => setFormData({ ...formData, vmiStartDate: e.target.value })}
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
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 border-t pt-4">
                                <p className="col-span-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Extubações (Total: {formData.extubations})</p>
                                <div className="space-y-1.5">
                                    <Label htmlFor="extSuccess" className="text-[10px] uppercase font-bold text-emerald-500">Programada (Sucesso)</Label>
                                    <Input
                                        id="extSuccess"
                                        type="number"
                                        inputMode="numeric"
                                        value={formData.extubationSuccess}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setFormData(prev => ({
                                                ...prev,
                                                extubationSuccess: val,
                                                extubations: val + prev.extubationFail + prev.extubationAccidental + prev.extubationSelf
                                            }));
                                        }}
                                        className="bg-emerald-50/50 h-11 border-emerald-100"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="extFail" className="text-[10px] uppercase font-bold text-rose-500">Falha de Extubação</Label>
                                    <Input
                                        id="extFail"
                                        type="number"
                                        inputMode="numeric"
                                        value={formData.extubationFail}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setFormData(prev => ({
                                                ...prev,
                                                extubationFail: val,
                                                extubations: prev.extubationSuccess + val + prev.extubationAccidental + prev.extubationSelf
                                            }));
                                        }}
                                        className="bg-rose-50/50 h-11 border-rose-100"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="extAccidental" className="text-[10px] uppercase font-bold text-amber-500">Acidental</Label>
                                    <Input
                                        id="extAccidental"
                                        type="number"
                                        inputMode="numeric"
                                        value={formData.extubationAccidental}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setFormData(prev => ({
                                                ...prev,
                                                extubationAccidental: val,
                                                extubations: prev.extubationSuccess + prev.extubationFail + val + prev.extubationSelf
                                            }));
                                        }}
                                        className="bg-amber-50/50 h-11 border-amber-100"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="extSelf" className="text-[10px] uppercase font-bold text-amber-500">Auto-extubação</Label>
                                    <Input
                                        id="extSelf"
                                        type="number"
                                        inputMode="numeric"
                                        value={formData.extubationSelf}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setFormData(prev => ({
                                                ...prev,
                                                extubationSelf: val,
                                                extubations: prev.extubationSuccess + prev.extubationFail + prev.extubationAccidental + val
                                            }));
                                        }}
                                        className="bg-amber-50/50 h-11 border-amber-100"
                                    />
                                </div>
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

                            {/* Medical Record Section */}
                            {patient.lastGeneratedRecord && (
                                <div className="space-y-3 pb-2 border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-600" />
                                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Prontuário Gerado</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCopyRecord}
                                                className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                                                title="Copiar Prontuário"
                                            >
                                                <CopyIcon className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsEditingRecord(!isEditingRecord)}
                                                className={`h-8 px-3 gap-1.5 text-xs font-semibold ${isEditingRecord ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}`}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                <span>{isEditingRecord ? "Cancelar" : "Editar"}</span>
                                            </Button>
                                        </div>
                                    </div>

                                    {isEditingRecord ? (
                                        <div className="space-y-3">
                                            <Textarea
                                                value={editedRecord}
                                                onChange={(e) => setEditedRecord(e.target.value)}
                                                className="min-h-[300px] font-mono text-xs leading-relaxed"
                                                placeholder="Edite o prontuário aqui..."
                                            />
                                            <Button
                                                onClick={handleSaveEditedRecord}
                                                disabled={isProcessing}
                                                className="w-full bg-blue-600 hover:bg-blue-700 h-10 gap-2"
                                            >
                                                {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                                                Salvar Prontuário
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-[300px] overflow-y-auto">
                                            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-slate-700">
                                                {patient.lastGeneratedRecord}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}

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
                </div>
            </DialogContent>
        </Dialog>
    );
}
