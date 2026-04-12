import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

try {
    const ai = new GoogleGenAI({ apiKey });
    
    // In @google/genai, generateContent is on ai.models
    console.log('Attempting generateContent...');
    const result = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: 'Say hello!' }] }]
    });

    console.log('Response:', result.response.text());
} catch (error) {
    console.error('Unified SDK Test Failed:', error);
}
