"use client";

import { useState, useEffect } from "react";
import { BedTable } from "@/components/bed-table";
import { PatientModal } from "@/components/patient-modal";
import { Patient } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { SettingsModal } from "@/components/settings-modal";
import { Settings2, Activity, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [beds, setBeds] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    hospitalName: "EvoluiAI ICU",
    totalBeds: 10
  });

  // Fetch settings and beds from Supabase on mount
  useEffect(() => {
    const initializeData = async () => {
      await fetchSettings();
      await fetchBeds();
    };
    initializeData();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) throw error;
      if (data) {
        setSettings({
          hospitalName: data.hospital_name,
          totalBeds: data.total_beds
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const fetchBeds = async () => {
    setIsLoading(true);
    try {
      // First fetch current patients
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("bed_number");

      if (error) throw error;

      // Get latest settings to be sure
      const { data: settingsData } = await supabase
        .from("settings")
        .select("total_beds")
        .eq("id", 1)
        .single();

      const totalBedsConfig = settingsData?.total_beds || settings.totalBeds;

      let currentBeds = data || [];

      // Check if we need to create missing beds
      const existingBedNumbers = new Set(currentBeds.map(p => parseInt(p.bed_number, 10)));
      const bedsToCreate = [];

      for (let i = 1; i <= totalBedsConfig; i++) {
        if (!existingBedNumbers.has(i)) {
          bedsToCreate.push({
            bed_number: i.toString().padStart(2, '0'),
            initials: "-",
            status: "Vago",
            history: [],
            extubations: 0
          });
        }
      }

      if (bedsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from("patients")
          .insert(bedsToCreate);

        if (!insertError) {
          // Re-fetch if created new beds
          const { data: updatedData } = await supabase
            .from("patients")
            .select("*")
            .order("bed_number");
          currentBeds = updatedData || [];
        }
      }

      // Map and filter based on totalBeds configuration
      const mappedBeds: Patient[] = currentBeds
        .filter(p => parseInt(p.bed_number, 10) <= totalBedsConfig)
        .map((p: any) => ({
          id: p.id,
          bedNumber: p.bed_number,
          initials: p.initials,
          status: p.status,
          vmiStartDate: p.vmi_start_date,
          lastIMS: p.last_ims,
          history: p.history || [],
          extubations: p.extubations,
          extubationSuccess: p.extubation_success_count || 0,
          extubationFail: p.extubation_fail_count || 0,
          extubationAccidental: p.extubation_accidental_count || 0,
          extubationSelf: p.extubation_self_count || 0,
          lastGeneratedRecord: p.last_generated_record
        }));
      setBeds(mappedBeds);

      // If a patient is currently selected, update its data to reflect changes immediately
      if (selectedPatient) {
        const updatedSelected = mappedBeds.find(p => p.bedNumber === selectedPatient.bedNumber);
        if (updatedSelected) {
          setSelectedPatient(updatedSelected);
        }
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
      // Find patient to get stats
      const patientToClear = beds.find(p => p.bedNumber === bedNumber);

      if (patientToClear && (patientToClear.status !== 'Vago' || patientToClear.initials !== '-')) {
        let mvDuration = 0;
        if (patientToClear.vmiStartDate) {
          const diff = new Date().getTime() - new Date(patientToClear.vmiStartDate).getTime();
          mvDuration = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }

        // Save to history
        const { error: dischargeError } = await supabase
          .from("patient_discharges")
          .insert({
            discharge_date: new Date().toISOString(),
            bed_number: bedNumber,
            mv_duration_days: mvDuration,
            extubation_success_count: patientToClear.extubationSuccess || 0,
            extubation_fail_count: patientToClear.extubationFail || 0,
            extubation_accidental_count: patientToClear.extubationAccidental || 0,
            extubation_self_count: patientToClear.extubationSelf || 0
          });

        if (dischargeError) {
          console.error("Error saving discharge history:", dischargeError);
          // We continue to clear even if history fails, or maybe alert? 
          // Let's just log for now to not block workflow.
        }
      }

      const { error } = await supabase
        .from("patients")
        .update({
          initials: "-",
          status: "Vago",
          vmi_start_date: null,
          last_ims: null, // map back to db column
          history: [],
          extubations: 0,
          extubation_success_count: 0,
          extubation_fail_count: 0,
          extubation_accidental_count: 0,
          extubation_self_count: 0,
          last_generated_record: null
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
              {settings.hospitalName} <span className="text-slate-500 font-normal hidden xs:inline">ICU</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border text-xs font-medium text-slate-600">
              <span className={`h-2 w-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`} />
              Online
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(true)} title="Configurações">
              <Settings2 className="h-4 w-4 text-slate-500" />
            </Button>
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" title="Dashboard">
                <LayoutDashboard className="h-4 w-4 text-slate-500" />
              </Button>
            </Link>
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

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSettingsUpdate={async () => {
            await fetchSettings();
            await fetchBeds();
          }}
        />
      </main>
    </div>
  );
}
