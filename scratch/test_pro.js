import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        // List models is usually on the genAI object or similar
        // Actually, listing models might require the discovery service or similar
        // In @google/generative-ai, there isn't a direct listModels method on the genAI object usually.
        // It's often done via a separate fetch or a different part of the SDK.
        
        // Let's try a common model like gemini-pro
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result = await model.generateContent('Say hello!');
        console.log('gemini-pro response:', result.response.text());
        console.log('✅ gemini-pro works!');
    } catch (error) {
        console.error('❌ gemini-pro failed:', error.message);
    }
}

listModels();
