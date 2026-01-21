
export interface N8NResponse {
    transcription: string;
    ims_target: number;
    ims_achieved: number;
    days_on_vm: number;
    extubations: number;
}

export async function sendAudioToN8n(audioBlob: Blob, bedNumber: string): Promise<N8NResponse> {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");
    formData.append("bedNumber", bedNumber);

    // Using the specific webhook URL provided by the user
    const WEBHOOK_URL = "https://webhook.privacygaby.online/webhook/andrea";

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`N8N Webhook failed with status: ${response.status}`);
        }

        const data = await response.json();

        // Validate response structure loosely
        if (typeof data.ims_target === 'undefined' || typeof data.ims_achieved === 'undefined') {
            console.warn("N8N response missing expected IMS fields", data);
        }

        return data as N8NResponse;
    } catch (error) {
        console.error("Error sending audio to N8N:", error);
        throw error;
    }
}
