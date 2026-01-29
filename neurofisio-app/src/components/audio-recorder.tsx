"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Loader2, RotateCcw, Play, Pause, Trash2, Upload } from "lucide-react";

interface AudioRecorderProps {
    onRecordingComplete: (blob: Blob) => void;
    isSending: boolean;
}

export function AudioRecorder({ onRecordingComplete, isSending }: AudioRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioUrl) URL.revokeObjectURL(audioUrl);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, [audioUrl]);

    const drawWaveform = (analyser: AnalyserNode) => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = "rgb(248, 250, 252)"; // bg-slate-50
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.lineWidth = 3;
            ctx.strokeStyle = "rgb(244, 63, 94)"; // text-rose-500
            ctx.beginPath();

            const sliceWidth = canvas.width / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };

        draw();
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // Audio Context for visualization
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                setAudioBlob(blob);
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);
                stream.getTracks().forEach((track) => track.stop());
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            drawWaveform(analyser);

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
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setIsPlaying(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith("audio/")) {
                alert("Por favor, selecione um arquivo de áudio.");
                return;
            }
            setAudioBlob(file);
            const url = URL.createObjectURL(file);
            setAudioUrl(url);
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
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

            {isRecording && (
                <canvas
                    ref={canvasRef}
                    width={300}
                    height={60}
                    className="w-full h-12 rounded-lg"
                />
            )}

            <div className="flex items-center justify-center gap-6 w-full">
                {!isRecording && !audioBlob && (
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col items-center gap-3">
                            <Button
                                onClick={startRecording}
                                variant="destructive"
                                className="rounded-full w-20 h-20 p-0 flex items-center justify-center bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-200"
                            >
                                <Mic className="h-10 w-10 text-white" />
                            </Button>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gravar</span>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="audio/*"
                                className="hidden"
                            />
                            <Button
                                onClick={() => fileInputRef.current?.click()}
                                variant="outline"
                                className="rounded-full w-20 h-20 p-0 flex items-center justify-center border-slate-200 text-slate-500 bg-white hover:bg-slate-50 shadow-lg shadow-slate-100"
                            >
                                <Upload className="h-9 w-9" />
                            </Button>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subir</span>
                        </div>
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
                    <div className="flex flex-col items-center gap-4 w-full">
                        <div className="flex items-center gap-3 w-full bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <Button
                                onClick={togglePlayback}
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 rounded-full text-blue-600 hover:bg-blue-50"
                            >
                                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
                            </Button>
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 w-full animate-pulse" />
                            </div>
                            <audio
                                ref={audioRef}
                                src={audioUrl || ""}
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                onEnded={() => setIsPlaying(false)}
                                className="hidden"
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full">
                            <Button
                                onClick={resetRecording}
                                variant="outline"
                                className="flex-1 rounded-xl h-12 border-slate-200 text-slate-500 hover:bg-slate-50 font-bold"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Resetar
                            </Button>
                            <Button
                                onClick={handleSend}
                                className="flex-[2] rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200"
                            >
                                Processar <Send className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}

                {isSending && (
                    <div className="flex flex-col items-center gap-3 w-full">
                        <div className="relative">
                            <div className="h-20 w-20 rounded-full border-4 border-slate-200 animate-pulse" />
                            <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-blue-500 animate-spin" />
                        </div>
                        <span className="text-sm font-bold text-blue-500 uppercase tracking-widest">Analisando...</span>
                    </div>
                )}
            </div>

            {!isRecording && !audioBlob && !isSending && (
                <p className="text-[10px] text-slate-400 font-medium text-center px-4 leading-tight">
                    Grave ou suba o resumo do paciente (IMS, Dias VPM, etc)
                </p>
            )}
        </div>
    );
}
