import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

async function listModels() {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.error) {
            console.error('API Error:', data.error.message);
            return;
        }

        console.log('Available Models:');
        data.models.forEach(m => console.log(`- ${m.name}`));
    } catch (error) {
        console.error('Network Error:', error.message);
    }
}

listModels();
