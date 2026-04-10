import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI(apiKey);

try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("Hello, are you working?");
    const response = await result.response;
    console.log("Success:", response.text());
} catch (error) {
    console.error("Failure:", error.message);
}
