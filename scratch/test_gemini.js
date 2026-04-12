import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('GEMINI_API_KEY is missing');
    process.exit(1);
}

try {
    console.log('Testing with apiKey:', apiKey.substring(0, 5) + '...');
    
    // Testing the constructor
    const genAI = new GoogleGenAI(apiKey); 
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent('Say hello!');
    const response = await result.response;
    console.log('Response:', response.text());
} catch (error) {
    console.error('Test Failed:', error);
}
