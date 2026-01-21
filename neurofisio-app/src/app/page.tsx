"use client";

import { useState, useEffect } from "react";
import { BedTable } from "@/components/bed-table";
import { PatientModal } from "@/components/patient-modal";
import { bedsData } from "@/lib/mock-data";
import { Patient } from "@/lib/types";
import { Activity, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [beds, setBeds] = useState<Patient[]>(bedsData);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch beds from Supabase on mount
  useEffect(() => {
    fetchBeds();
  }, []);

  const fetchBeds = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("bed_number");

      if (error) throw error;

      if (data && data.length > 0) {
        // Map Supabase data to Patient type
        const mappedBeds: Patient[] = data.map((p: any) => ({
          id: p.id,
          bedNumber: p.bed_number,
          initials: p.initials,
          status: p.status,
          vmiStartDate: p.vmi_start_date,
          lastIMS: p.last_ims,
          history: p.history || [],
          extubations: p.extubations
        }));
        setBeds(mappedBeds);
      }
    } catch (error) {
      console.error("Error fetching beds:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedPatient(null), 300);
    fetchBeds(); // Refresh data when modal closes
  };

  const handleClearPatient = async (bedNumber: string) => {
    try {
      const { error } = await supabase
        .from("patients")
        .update({
          initials: "-",
          status: "Vago",
          vmi_start_date: null,
          last_ims: null, // map back to db column
          history: [],
          extubations: 0
        })
        .eq("bed_number", bedNumber);

      if (error) throw error;

      fetchBeds();
      handleCloseModal();
    } catch (error) {
      console.error("Error clearing patient:", error);
      alert("Erro ao limpar leito.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
              EvoluiAI <span className="text-slate-500 font-normal hidden xs:inline">ICU</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border text-xs font-medium text-slate-600">
              <span className={`h-2 w-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
              Online
            </div>
            <Button variant="ghost" size="icon" onClick={fetchBeds} title="Refresh" className="h-9 w-9 md:h-8 md:w-8">
              <RotateCcw className={`h-4 w-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 md:px-8 py-6 md:py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-800">Visão Geral dos Leitos</h2>
          <p className="text-slate-500 mt-1">
            Gerenciamento e evolução de pacientes da Unidade de Terapia Intensiva.
          </p>
        </div>

        <BedTable
          data={beds}
          onSelectPatient={handleSelectPatient}
          onClearPatient={handleClearPatient}
        />

        <PatientModal

          patient={selectedPatient}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onClearPatient={handleClearPatient}
          onSuccessfulUpdate={fetchBeds}
        />
      </main>
    </div>
  );
}
