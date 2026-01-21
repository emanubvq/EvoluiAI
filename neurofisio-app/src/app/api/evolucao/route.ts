import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const bedNumber = formData.get("bedNumber") as string;

        if (!file || !bedNumber) {
            return NextResponse.json(
                { error: "File and Bed Number are required" },
                { status: 400 }
            );
        }

        // 1. Transcribe with OpenAI Whisper
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });

        const buffer = Buffer.from(await file.arrayBuffer());
        // Create a File object-like structure for OpenAI if needed, or pass the file directly if environment allows.
        // However, "openai" package usually expects a 'File' from 'fetch' API or a ReadStream.
        // In Edge/Node, we might need to cast or convert.
        // The simplest way for OpenAI node SDK:
        const transcription = await openai.audio.transcriptions.create({
            file: new File([buffer], file.name, { type: file.type }),
            model: "whisper-1",
            language: "pt",
        });

        const text = transcription.text;
        console.log("Transcribed:", text);

        // 2. Extract Data with Google Gemini
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using flash as requested/efficient

        const prompt = `
      Extract clinical data from this text about an ICU patient.
      Text: "${text}"
      
      Return a JSON object with:
      - initials: string (if mentioned)
      - status: string (enum: 'Vago', 'VMI', 'VNI', 'Alta', 'Desmame')
      - vmi_start_date: string (ISO date YYYY-MM-DD, infer context 'today'='${new Date().toISOString().split('T')[0]}') or null
      - history_entry: string (summary of the event)
      - extubations_increment: number (count if extubation happened)
      - ims: { target: number, achieved: number } or null

      JSON:
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonText = response.text();
        // Clean markdown code blocks if any
        jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

        const data = JSON.parse(jsonText);

        // 3. Update Supabase
        // First get current extubations
        const { data: currentBed } = await supabase
            .from("patients")
            .select("extubations, history, last_ims")
            .eq("bed_number", bedNumber)
            .single();

        const newExtubations = (currentBed?.extubations || 0) + (data.extubations_increment || 0);
        const newHistory = [
            ...(currentBed?.history || []),
            {
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                text: data.history_entry || text,
                metrics: data.ims ? `IMS Alvo: ${data.ims.target} / Atingido: ${data.ims.achieved}` : undefined
            }
        ];

        const updates: any = {
            status: data.status,
            history: newHistory,
            extubations: newExtubations,
            updated_at: new Date().toISOString(),
        };

        if (data.initials) updates.initials = data.initials;
        if (data.vmi_start_date) updates.vmi_start_date = new Date(data.vmi_start_date).toISOString();
        if (data.ims) updates.last_ims = data.ims;

        const { error } = await supabase
            .from("patients")
            .upsert({ bed_number: bedNumber, ...updates }, { onConflict: "bed_number" });

        if (error) {
            console.error("Supabase error:", error);
            throw error;
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
