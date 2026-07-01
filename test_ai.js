import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    try {
        console.log("Key:", process.env.GEMINI_API_KEY ? "EXISTS" : "MISSING");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = "Say hello";
        const result = await model.generateContent(prompt);
        console.log(result.response.text());
    } catch(e) {
        console.error("ERROR:", e);
    }
}
test();
