"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { IMSSuccessChart, ExtubationTypeChart } from "@/components/dashboard-charts";
import { Button } from "@/components/ui/button";
import { ChevronLeft, CalendarRange, ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import { subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type DateFilter = "weekly" | "monthly";

export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<DateFilter>("monthly");
    const [dateRangeLabel, setDateRangeLabel] = useState("");

    // Metrics State
    const [vpmAverage, setVpmAverage] = useState(0);
    const [imsCompliance, setImsCompliance] = useState(0); // This is % of days met
    const [imsData, setImsData] = useState<any[]>([]); // For chart
    const [extubationTotal, setExtubationTotal] = useState(0);
    const [extubationData, setExtubationData] = useState<any[]>([]);
    const [extubationFailRate, setExtubationFailRate] = useState(0);

    const [vpmTrend, setVpmTrend] = useState<"up" | "down" | "neutral">("neutral");
    const [imsTrend, setImsTrend] = useState<"up" | "down" | "neutral">("neutral");

    useEffect(() => {
        fetchDashboardData();
    }, [filter]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const now = new Date();
            let start, end;

            if (filter === "weekly") {
                start = startOfWeek(now, { locale: ptBR });
                end = endOfWeek(now, { locale: ptBR });
                setDateRangeLabel(`Semana de ${format(start, "dd/MM")} a ${format(end, "dd/MM")}`);
            } else {
                start = startOfMonth(now);
                end = endOfMonth(now);
                setDateRangeLabel(format(now, "MMMM yyyy", { locale: ptBR }).toUpperCase());
            }

            const startStr = start.toISOString();
            const endStr = end.toISOString();

            // 1. DATA FETCHING

            // a) Daily Metrics (IMS)
            const { data: metrics } = await supabase
                .from("daily_metrics")
                .select("*")
                .gte("date", startStr.split('T')[0])
                .lte("date", endStr.split('T')[0]);

            // b) Discharges (VPM history + Extubations history)
            const { data: discharges } = await supabase
                .from("patient_discharges")
                .select("*")
                .gte("discharge_date", startStr)
                .lte("discharge_date", endStr);

            // c) Active Patients (Current VPM + Current Extubations count)
            const { data: activePatients } = await supabase
                .from("patients")
                .select("*")
                // For active patients, we consider them "in this period" if they are currently active
                .neq("status", "Vago");

            // 2. CALCULATIONS

            // --- VPM Average ---
            // Combine finished VPM durations (from discharges) + current VPM durations (from active)
            let totalVPMDays = 0;
            let vpmCount = 0;

            discharges?.forEach(d => {
                if (d.mv_duration_days > 0) {
                    totalVPMDays += d.mv_duration_days;
                    vpmCount++;
                }
            });

            activePatients?.forEach(p => {
                if (p.vmi_start_date) {
                    const diff = now.getTime() - new Date(p.vmi_start_date).getTime();
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
                    totalVPMDays += days;
                    vpmCount++;
                }
            });

            const avgVPM = vpmCount > 0 ? Math.round(totalVPMDays / vpmCount) : 0;
            setVpmAverage(avgVPM);
            setVpmTrend(avgVPM > 5 ? "down" : "up"); // "Bad" if higher than target (5)

            // --- IMS Compliance ---
            // Calculate % of logs where achieved >= target
            let imsMet = 0;
            let imsTotal = 0;

            metrics?.forEach(m => {
                if (m.ims_target > 0) {
                    imsTotal++;
                    if (m.ims_achieved >= m.ims_target) imsMet++;
                }
            });

            const imsRate = imsTotal > 0 ? Math.round((imsMet / imsTotal) * 100) : 0;
            setImsCompliance(imsRate);
            setImsTrend(imsRate >= 80 ? "up" : "down");

            setImsData([
                { name: 'Atingido', value: imsRate },
                { name: 'Não Atingido', value: 100 - imsRate }
            ]);

            // --- Extubations ---
            let extSuccess = 0, extFail = 0, extAccidental = 0, extSelf = 0;

            // From history
            discharges?.forEach(d => {
                extSuccess += d.extubation_success_count || 0;
                extFail += d.extubation_fail_count || 0;
                extAccidental += d.extubation_accidental_count || 0;
                extSelf += d.extubation_self_count || 0;
            });

            // From active (accumulated counts)
            activePatients?.forEach(p => {
                extSuccess += p.extubation_success_count || 0;
                extFail += p.extubation_fail_count || 0;
                extAccidental += p.extubation_accidental_count || 0;
                extSelf += p.extubation_self_count || 0;
            });

            const totalExt = extSuccess + extFail + extAccidental + extSelf;
            setExtubationTotal(totalExt);

            const failRate = totalExt > 0 ? ((extFail / totalExt) * 100).toFixed(0) : 0;
            setExtubationFailRate(Number(failRate));

            setExtubationData([
                { name: 'Programada (Sucesso)', value: extSuccess, color: '#10b981' },
                { name: 'Falha', value: extFail, color: '#f43f5e' },
                { name: 'Acidental', value: extAccidental, color: '#f59e0b' },
                { name: 'Autoextubação', value: extSelf, color: '#0ea5e9' } // Changed color to blueish for visibility
            ].filter(d => d.value > 0)); // Only show non-zero? Or show all 0s? The chart handles 0 fine, maybe filter for cleaner look


        } catch (error) {
            console.error("Error loading dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-blue-700 text-white p-4 rounded-xl shadow-md flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/">
                            <Button variant="ghost" className="text-white hover:bg-blue-600 hover:text-white p-2 h-auto">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold tracking-wide">PAINEL GERENCIAL - UTI NEUROFISIO</h1>
                    </div>
                    <div className="flex gap-2">
                        {/* Fake month navigator for aesthetics, logic linked to filter state */}
                        <div className="bg-white rounded-md flex items-center px-1">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600" onClick={() => setFilter(f => f === 'weekly' ? 'monthly' : 'weekly')}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="min-w-[140px] text-center text-sm font-bold text-slate-700 select-none">
                                {dateRangeLabel}
                            </span>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600" onClick={() => setFilter(f => f === 'weekly' ? 'monthly' : 'weekly')}>
                                <ChevronLeft className="h-4 w-4 rotate-180" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Select value={filter} onValueChange={(v: DateFilter) => setFilter(v)}>
                        <SelectTrigger className="w-[180px] bg-white border-none shadow-sm font-bold text-slate-700">
                            <SelectValue placeholder="Filtrar por..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="weekly">Visão Semanal</SelectItem>
                            <SelectItem value="monthly">Visão Mensal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {loading ? (
                    <div className="h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <>
                        {/* Top Cards Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* VPM Card */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col items-center text-center relative overflow-hidden">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">VPM MÉDIO</h3>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-5xl font-extrabold text-red-600">{vpmAverage} DIAS</span>
                                    {vpmTrend === 'down' ? (
                                        <ArrowDown className="h-8 w-8 text-red-500" />
                                    ) : (
                                        <ArrowDown className="h-8 w-8 text-green-500 rotate-180" /> // Using ArrowDown rotated for Up usually means 'increase', but here we want 'decrease' is good. 
                                        // If trend is 'down' (bad), we show arrow up (red). If trend 'up' (good), arrow down (green).
                                        // Wait. logic above: setVpmTrend(avg > 5 ? "down" : "up"). 
                                        // If avg 10 (bad), trend='down'. We want to show RED ARROW UP/DOWN?
                                        // Image shows red arrow DOWN next to 10 Days. Maybe that means it went down from previous?
                                        // Let's stick to: Red Arrow = Bad/Warning. Green Arrow = Good.
                                        // If > 5, Red Arrow.
                                    )}
                                </div>
                                <span className="text-xs font-bold text-slate-400">Alvo: 5 Dias</span>
                            </div>

                            {/* IMS Card */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col items-center text-center">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">ADESÃO IMS</h3>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-5xl font-extrabold ${imsTrend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {imsCompliance}%
                                    </span>
                                    {imsTrend === 'up' ? (
                                        <ArrowUp className="h-8 w-8 text-emerald-500" />
                                    ) : (
                                        <ArrowDown className="h-8 w-8 text-red-500" />
                                    )}
                                </div>
                                <span className="text-xs font-bold text-slate-400">Atingido vs. Alvo</span>
                            </div>

                            {/* Extubations Card */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col items-center text-center">
                                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">EXTUBAÇÕES</h3>
                                <div className="flex flex-col items-center mb-1">
                                    <span className="text-5xl font-extrabold text-slate-700">{extubationTotal} TOTAL</span>
                                </div>
                                <span className="text-xs font-bold text-slate-400">
                                    {extubationData.find(d => d.name === 'Falha')?.value || 0} Falha ({extubationFailRate}%)
                                </span>
                            </div>
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Bar Chart */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 min-h-[350px]">
                                <h3 className="text-base font-bold text-slate-700 mb-6 text-center">TIPOS DE EXTUBAÇÃO</h3>
                                <ExtubationTypeChart data={extubationData} />
                            </div>

                            {/* Donut Chart */}
                            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 min-h-[350px]">
                                <h3 className="text-base font-bold text-slate-700 mb-6 text-center">SUCESSO IMS (ALVO)</h3>
                                <IMSSuccessChart data={imsData} />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
