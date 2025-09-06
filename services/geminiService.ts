import { GoogleGenAI, Type } from "@google/genai";
import type { TranscriptSegment } from '../types';

// The API key is expected to be set in the environment variables.
// The GoogleGenAI constructor will throw an error if apiKey is missing or invalid.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


const REVISION_PROMPT = `
You are an expert script editor for professional YouTube videos and technology based tutorials.
Your task is to revise a transcript to be more professional, clear, concise, and engaging.
- Eliminate filler words (e.g., "uh", "um", "like", "you know").
- Correct grammatical errors and rephrase sentences for better flow and impact.
- Go into further detail about the concepts being presented if timing allows.
- Keep the tone upbeat and engaging.
- Maintain the original meaning and intent of each segment.
- DO NOT merge or split segments. The output must be a JSON array with the exact same number of elements as the input array.
- Each object in the output array must retain the original 'start' and 'end' timestamps. Only modify the 'text' field.

The original transcript is provided below as a JSON string. Respond with only the revised JSON string.

Original Transcript:
`;

const transcriptSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            start: {
                type: Type.NUMBER,
                description: 'The start time of the segment in seconds.',
            },
            end: {
                type: Type.NUMBER,
                description: 'The end time of the segment in seconds.',
            },
            text: {
                type: Type.STRING,
                description: 'The revised, professional text for the segment.',
            },
        },
        required: ['start', 'end', 'text'],
    },
};


export const reviseScriptWithAI = async (transcript: TranscriptSegment[]): Promise<TranscriptSegment[]> => {
    const fullPrompt = `${REVISION_PROMPT}${JSON.stringify(transcript, null, 2)}`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: transcriptSchema,
            },
        });

        const jsonText = response.text.trim();
        const revisedData = JSON.parse(jsonText);
        
        if (!Array.isArray(revisedData) || revisedData.length !== transcript.length) {
            console.error("AI response format mismatch", {expected: transcript.length, received: revisedData.length});
            throw new Error("AI response did not match the expected format.");
        }

        return revisedData as TranscriptSegment[];

    } catch (error) {
        console.error("Error revising script with Gemini:", error);
        throw new Error("Failed to get a valid revision from the AI. Please try again.");
    }
};

const ANALYSIS_PROMPT = `
You are a professional video script editor and creative director.
Your task is to analyze a video script and a series of keyframes from the corresponding video.
Provide a concise, actionable analysis of how well the script aligns with the visuals.

Based on the provided script and frames, please evaluate the following:
1.  **Visual-Script Sync:** Does the on-screen action match the spoken words? Point out specific examples of good sync or misalignment.
2.  **Pacing and Flow:** Is the pacing of the script appropriate for the visuals? Suggest any changes to timing or content.
3.  **Engagement:** How engaging is the combination of script and visuals? Offer creative suggestions for improvement, such as adding B-roll, on-screen graphics, or changing the delivery.
4.  **Clarity of Message:** Is the core message effectively communicated? How could the visuals better support the key points in the script?

Present your feedback in a structured, easy-to-read format using markdown (e.g., headings, bullet points).

The script is provided below as a JSON string, and the keyframes are provided as images.
`;

export const analyzeScriptAndVision = async (
    transcript: TranscriptSegment[],
    frames: string[] // Array of base64 encoded image strings
): Promise<string> => {
    // Gemini can accept base64 strings directly
    const imageParts = frames.map((frame) => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: frame.split(',')[1], // Remove the 'data:image/jpeg;base64,' prefix
        },
    }));

    const textPart = {
        text: `${ANALYSIS_PROMPT}\n\nScript:\n${JSON.stringify(transcript, null, 2)}`
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, ...imageParts] },
        });

        return response.text;
    } catch (error) {
        console.error("Error analyzing script and vision with Gemini:", error);
        throw new Error("Failed to get a vision analysis from the AI. Please try again.");
    }
};

const TRANSCRIPTION_PROMPT = `
You are an advanced AI audio transcription service. 
Your task is to transcribe the provided audio file.
The output must be a valid JSON array of objects.
Each object must represent a sentence or a distinct phrase and contain three properties:
1.  'start': The start time of the segment in seconds (number).
2.  'end': The end time of the segment in seconds (number).
3.  'text': The transcribed words for that segment (string).

Ensure the timestamps are accurate and cover the entire duration of the audio.
Do not add any commentary or markdown formatting. Respond ONLY with the JSON array.
`;

export const transcribeAudio = async (
    audioBase64: string,
    mimeType: string
): Promise<TranscriptSegment[]> => {
    const audioPart = {
        inlineData: {
            mimeType,
            data: audioBase64,
        },
    };

    const textPart = { text: TRANSCRIPTION_PROMPT };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: { parts: [textPart, audioPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: transcriptSchema,
            },
        });

        const jsonText = response.text.trim();
        const generatedTranscript = JSON.parse(jsonText);

        if (!Array.isArray(generatedTranscript)) {
            throw new Error("AI response was not a JSON array.");
        }

        return generatedTranscript as TranscriptSegment[];

    } catch (error) {
        console.error("Error transcribing audio with Gemini:", error);
        throw new Error("Failed to generate a transcript from the audio. The AI may not have been able to process the audio data.");
    }
};

const SINGLE_REVISION_PROMPT = `
You are an expert script editor for professional YouTube videos and technology-based tutorials.
Your task is to revise a single sentence or phrase to be more professional, clear, concise, and engaging.
- Eliminate filler words (e.g., "uh", "um", "like", "you know").
- Correct grammatical errors and rephrase for better flow and impact.
- Keep the tone upbeat and engaging.
- Maintain the original meaning and intent.
- Respond with ONLY the revised text string, no JSON, no markdown.

Original Text:
`;

export const reviseSingleSegment = async (originalText: string): Promise<string> => {
    const fullPrompt = `${SINGLE_REVISION_PROMPT}"${originalText}"`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: fullPrompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error revising single segment with Gemini:", error);
        throw new Error("Failed to revise the segment.");
    }
};
