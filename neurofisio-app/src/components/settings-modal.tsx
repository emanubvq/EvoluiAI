"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings2, Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSettingsUpdate: () => void;
}

export function SettingsModal({ isOpen, onClose, onSettingsUpdate }: SettingsModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [hospitalName, setHospitalName] = useState("");
    const [totalBeds, setTotalBeds] = useState(10);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("settings")
                .select("*")
                .eq("id", 1)
                .single();

            if (error) throw error;
            if (data) {
                setHospitalName(data.hospital_name);
                setTotalBeds(data.total_beds);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("settings")
                .update({
                    hospital_name: hospitalName,
                    total_beds: totalBeds,
                    updated_at: new Date().toISOString()
                })
                .eq("id", 1);

            if (error) throw error;

            alert("Configurações atualizadas!");
            onSettingsUpdate();
            onClose();
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Erro ao salvar configurações.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5 text-slate-600" />
                        <DialogTitle>Configurações da Unidade</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="hospitalName">Nome do Hospital / Unidade</Label>
                        <Input
                            id="hospitalName"
                            value={hospitalName}
                            onChange={(e) => setHospitalName(e.target.value)}
                            placeholder="Ex: UTI Adulto - Hospital Central"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="totalBeds">Quantidade de Leitos</Label>
                        <Input
                            id="totalBeds"
                            type="number"
                            value={totalBeds}
                            onChange={(e) => setTotalBeds(Number(e.target.value))}
                            min={1}
                            max={100}
                            disabled={isLoading}
                        />
                        <p className="text-[10px] text-slate-400">
                            Ajuste de acordo com a capacidade da unidade (Ex: 10, 27, 29).
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
                        {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Configurações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
