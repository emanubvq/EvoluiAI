"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Loader2, RotateCcw } from "lucide-react";

interface AudioRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
    isSending: boolean;
}

export function AudioRecorder({ onRecordingComplete, isSending }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                setAudioBlob(blob);
                stream.getTracks().forEach((track) => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Erro ao acessar microfone. Verifique as permissões.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const resetRecording = () => {
        setAudioBlob(null);
        setRecordingTime(0);
    };

    const handleSend = () => {
        if (audioBlob) {
            onRecordingComplete(audioBlob);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex flex-col items-center gap-4 p-6 w-full max-w-sm rounded-2xl bg-slate-50 border border-slate-100 shadow-inner">
            <div className={`text-4xl font-mono font-bold transition-colors ${isRecording ? 'text-rose-500 animate-pulse' : 'text-slate-700'}`}>
                {formatTime(recordingTime)}
            </div>

            <div className="flex items-center justify-center gap-6 w-full">
                {!isRecording && !audioBlob && (
                    <div className="flex flex-col items-center gap-3">
                        <Button
                            onClick={startRecording}
                            variant="destructive"
                            className="rounded-full w-20 h-20 p-0 flex items-center justify-center bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200"
                        >
                            <Mic className="h-10 w-10 text-white" />
                        </Button>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Gravar Evolução</span>
                    </div>
                )}

                {isRecording && (
                    <div className="flex flex-col items-center gap-3">
                        <Button
                            onClick={stopRecording}
                            variant="outline"
                            className="rounded-full w-20 h-20 p-0 flex items-center justify-center border-rose-500 text-rose-500 bg-white shadow-lg shadow-rose-100"
                        >
                            <Square className="h-8 w-8 fill-current" />
                        </Button>
                        <span className="text-sm font-bold text-rose-500 uppercase tracking-widest">Parar</span>
                    </div>
                )}

                {audioBlob && !isSending && (
                    <div className="flex items-center gap-4 w-full">
                        <Button
                            onClick={resetRecording}
                            variant="ghost"
                            className="rounded-full h-14 w-14 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        >
                            <RotateCcw className="h-6 w-6" />
                        </Button>
                        <Button
                            onClick={handleSend}
                            className="flex-1 rounded-xl h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg shadow-blue-200"
                        >
                            Processar <Send className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                )}

                {isSending && (
                    <div className="flex flex-col items-center gap-3 w-full">
                        <div className="relative">
                            <div className="h-20 w-20 rounded-full border-4 border-slate-200 animate-pulse" />
                            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-blue-500 animate-spin" />
                        </div>
                        <span className="text-sm font-bold text-blue-500 uppercase tracking-widest">Analisando Áudio...</span>
                    </div>
                )}
            </div>

            {!isRecording && !audioBlob && !isSending && (
                <p className="text-xs text-slate-400 font-medium text-center px-4">
                    Ao clicar, grave o resumo do paciente (IMS, Dias VPM, etc)
                </p>
            )}
        </div>
    );
}
