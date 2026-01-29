

export interface N8NResponse {
    formatted_record: string;
    bedNumber?: string;
    metadata?: {
        ims_target?: number;
        ims_achieved?: number;
        days_on_vm?: number;
        extubations?: number;
        vmi_start_date?: string;
    };
}

export async function sendAudioToN8n(audioBlob: Blob): Promise<N8NResponse> {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.webm");

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

        let data = await response.json();

        // Handle n8n array response format
        if (Array.isArray(data) && data.length > 0) {
            // Check if nested inside "output" property (common in n8n)
            if (data[0].output) {
                data = data[0].output;
            } else {
                // otherwise just take the first item
                data = data[0];
            }
        }

        // Validate response structure
        if (!data.formatted_record) {
            console.warn("N8N response missing formatted_record", data);
        }

        return data as N8NResponse;
    } catch (error) {
        console.error("Error sending audio to N8N:", error);
        throw error;
    }
}
