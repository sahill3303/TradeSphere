import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

async function testGemini() {
    try {
        console.log('Testing with gemini-2.0-flash...');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent('Say hello!');
        console.log('Response:', result.response.text());
        console.log('✅ Gemini API (2.0-flash) is working correctly!');
    } catch (error) {
        console.error('❌ Test Failed:', error.message);
    }
}

testGemini();
