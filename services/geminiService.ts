
import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";
import type { SearchResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

// FIX: Moved the `AIStudio` interface inside `declare global` to resolve a TypeScript error 
// about subsequent property declarations having conflicting types. This ensures the type is 
// correctly augmented in the global namespace.
declare global {
    interface AIStudio {
        hasSelectedApiKey: () => Promise<boolean>;
        openSelectKey: () => Promise<void>;
    }

    interface Window {
        aistudio?: AIStudio;
    }
}

function getAiClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

let chatInstance: Chat | null = null;

function getChatInstance(): Chat {
    if (!chatInstance) {
        const ai = getAiClient();
        chatInstance = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: 'You are a helpful and knowledgeable assistant specializing in high-tech news and scientific concepts. Explain things clearly and concisely.',
            },
        });
    }
    return chatInstance;
}

export async function getShortSummary(text: string): Promise<string> {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            // FIX: Use the recommended model name for flash lite.
            model: 'gemini-flash-lite-latest',
            contents: `Summarize the following article in 2-3 concise sentences, highlighting the key information:\n\n---\n${text}`,
        });
        return response.text;
    } catch (error)
    {
        console.error("Short summary generation failed:", error);
        return "Summary could not be generated at this time.";
    }
}

export async function getFastSummary(text: string): Promise<string> {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            // FIX: Use the recommended model name for flash lite.
            model: 'gemini-flash-lite-latest',
            contents: `Summarize the following article in 3 concise bullet points:\n\n---\n${text}`,
        });
        return response.text;
    } catch (error) {
        console.error("Fast summary generation failed:", error);
        return "Sorry, I couldn't generate a summary at this time.";
    }
}

export async function getDeepAnalysis(text: string): Promise<string> {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Provide a deep, insightful analysis of the following article. Consider the technological, ethical, and societal implications. Break it down into sections with clear headings:\n\n---\n${text}`,
            config: {
                thinkingConfig: { thinkingBudget: 32768 },
            }
        });
        return response.text;
    } catch (error) {
        console.error("Deep analysis generation failed:", error);
        return "Sorry, I couldn't generate a deep analysis at this time.";
    }
}

export async function searchWithGoogle(query: string): Promise<SearchResult> {
    try {
        const ai = getAiClient();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Answer the following question based on up-to-date information from the web: "${query}"`,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = groundingChunks
            .map((chunk: any) => ({
                uri: chunk.web?.uri || '',
                title: chunk.web?.title || 'Untitled Source',
            }))
            .filter((source: { uri: string; }) => source.uri);
            
        return {
            text: response.text,
            sources: sources,
        };

    } catch (error) {
        console.error("Google Search grounding failed:", error);
        throw new Error("Failed to fetch search results.");
    }
}

// FIX: Added the missing `generateVideo` function to support video generation,
// resolving the import error in `VideoGenerationModal.tsx`.
export async function generateVideo(
    params: {
        prompt?: string;
        image?: { data: string; mimeType: string };
        aspectRatio: '16:9' | '9:16';
    },
    onProgress: (message: string) => void
): Promise<string> {
    if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            onProgress('Please select an API key to continue.');
            await window.aistudio.openSelectKey();
            if (!(await window.aistudio.hasSelectedApiKey())) {
                throw new Error('An API key is required for video generation.');
            }
        }
    }

    // Per guidelines, create a new client right before the API call for Veo
    const ai = getAiClient();

    try {
        onProgress('Initializing video generation...');
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: params.prompt,
            ...(params.image && { image: { imageBytes: params.image.data, mimeType: params.image.mimeType } }),
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: params.aspectRatio
            }
        });

        onProgress('Processing your request... This can take several minutes.');
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            onProgress('Checking video status...');
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        onProgress('Video generated! Downloading...');
        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) {
            throw new Error('Video generation finished, but no download link was provided.');
        }

        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
        if (!response.ok) {
            throw new Error(`Failed to download the video file. Server responded with: ${response.statusText}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);

    } catch (e) {
        if (e instanceof Error && e.message.includes('Requested entity was not found')) {
            if (window.aistudio) {
                onProgress('API key error. Please select a valid key.');
                await window.aistudio.openSelectKey();
                throw new Error('Your API key was not found or is invalid. Please select a valid key and try again.');
            }
        }
        throw e;
    }
}

export async function streamChatResponse(
    message: string,
    onChunk: (chunk: string) => void
): Promise<void> {
    try {
        const chat = getChatInstance();
        const responseStream = await chat.sendMessageStream({ message });
        for await (const chunk of responseStream) {
            onChunk(chunk.text);
        }
    } catch (error) {
        console.error("Chat streaming failed:", error);
        onChunk("Sorry, an error occurred. Please try again.");
    }
}

export async function generateImageFromPrompt(prompt: string): Promise<string> {
    try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes: string = part.inlineData.data;
                return `data:image/png;base64,${base64ImageBytes}`;
            }
        }
        throw new Error("No image data found in response.");
    } catch (error) {
        console.error("Image generation failed:", error);
        throw new Error("Could not generate the image. Please try a different prompt.");
    }
}

export async function generateNewsBroadcastSpeech(
    text: string,
    language: 'English' | 'Hindi' | 'Hinglish'
): Promise<string | null> {
    const ai = getAiClient();

    const languagePrompts = {
        English: `Rewrite the following news article into a natural, conversational script for two news anchors, Orion (male) and Celeste (female). Format it strictly as 'Orion: ...' and 'Celeste: ...' on new lines. Keep it engaging and clear.\n\nARTICLE:\n${text}`,
        Hindi: ` निम्नलिखित समाचार लेख को दो समाचार एंकर, ओरियन (पुरुष) और सेलेस्टे (महिला) के लिए एक स्वाभाविक, संवादी स्क्रिप्ट में फिर से लिखें। इसे सख्ती से 'Orion: ...' और 'Celeste: ...' के रूप में नई पंक्तियों पर प्रारूपित करें। इसे आकर्षक और स्पष्ट रखें।\n\nARTICLE:\n${text}`,
        Hinglish: `Rewrite the following news article into a natural, conversational Hinglish (Hindi + English) script for two news anchors, Orion (male) and Celeste (female). Format it strictly as 'Orion: ...' and 'Celeste: ...' on new lines. Keep it engaging and clear.\n\nARTICLE:\n${text}`,
    };

    try {
        // Step 1: Generate conversational script
        const scriptResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: languagePrompts[language],
        });
        const script = scriptResponse.text;

        // Step 2: Generate multi-speaker audio from the script
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: script }] }],
            config: {
                // FIX: Use Modality enum for responseModalities as per guidelines.
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: [
                            { speaker: 'Orion', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
                            { speaker: 'Celeste', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
                        ]
                    }
                }
            }
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Conversational speech generation failed:", error);
        return null;
    }
}

export async function generateSpeechFromText(text: string): Promise<string | null> {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // A standard male voice
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio || null;
    } catch (error) {
        console.error("Single-speaker speech generation failed:", error);
        return null;
    }
}