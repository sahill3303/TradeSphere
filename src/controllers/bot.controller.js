import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const SYSTEM_INSTRUCTION = "You are TradeSphere AI, the exclusive and elite stock market assistant for TradeSphere. You must answer ANY question the user asks, but do so critically through the lens of a top-tier finance expert. Always maintain a premium, personalized, and highly professional tone, making the user feel like a VIP trader. Use trading analogies, market concepts, and financial terminology logically. Keep responses concise unless asked for detailed explanations.";

export const handleChat = async (req, res) => {
    try {
        const { messages, newMessage } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ success: false, message: 'GEMINI_API_KEY is not configured in backend .env' });
        }

        const ai = new GoogleGenAI({ apiKey });

        const contents = [];
        if (messages && Array.isArray(messages)) {
            for (const msg of messages) {
                contents.push({
                    role: msg.role === 'ai' ? 'model' : 'user',
                    parts: [{ text: msg.content }]
                });
            }
        }
        contents.push({ role: 'user', parts: [{ text: newMessage }] });

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: contents,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION
            }
        });

        res.json({ success: true, text: response.text });
    } catch (error) {
        console.error('Bot Error:', error);
        res.status(500).json({ success: false, message: 'Failed to communicate with AI model.', error: error.message });
    }
};
