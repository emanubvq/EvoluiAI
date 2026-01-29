"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];
const DONUT_COLORS = ["#10b981", "#ef4444"]; // Green (Achieved), Red (Not Achieved)

export function MVChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">Sem dados de VPM</div>;
    }
    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="bed" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis label={{ value: 'Dias', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="days" name="Dias em VPM" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
        </ResponsiveContainer>
    );
}

export function IMSHistoryChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">Sem dados de IMS no período</div>;
    }
    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="target" name="Alvo" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="achieved" name="Atingido" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} dot={{ r: 3 }} />
            </LineChart>
        </ResponsiveContainer>
    );
}

// Donut Chart for IMS Success Rate
export function IMSSuccessChart({ data }: { data: any[] }) {
    // data: [{ name: 'Atingido', value: 80 }, { name: 'Não Atingido', value: 20 }]
    if (!data || data.every(d => d.value === 0)) {
        return <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">Sem dados de IMS</div>;
    }

    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`${Number(value).toFixed(0)}%`, '']}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
        </ResponsiveContainer>
    );
}

// Bar Chart for Extubation Types
export function ExtubationTypeChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">Sem dados de Extubação</div>;
    }
    // data: [{ name: 'Programada', value: 7 }, { name: 'Acidental', value: 1 }, ...]

    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" width={100} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="value" name="Quantidade" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={24}>
                    {data.map((entry, index) => (
                        // Optional: Different colors for specific types if desired, but blue standard is fine
                        <Cell key={`cell-${index}`} fill={entry.color || "#0284c7"} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

// Keep the old pie chart around just in case, but renamed or unused
export function ExtubationPieChart({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">Sem dados</div>;
    }
    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}
