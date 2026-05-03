const dotenv = require('dotenv');
dotenv.config();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: 'https://api.minimaxi.com/v1',
  timeout: 30000,
});

async function main() {
  console.log('Test 1: /v1/chat/completions');
  try {
    const response = await client.chat.completions.create({
      model: 'MiniMax-M2.7',
      messages: [{ role: 'user', content: 'Say "hello" in Chinese' }],
      max_tokens: 50
    });
    console.log('SUCCESS:', response.choices[0].message.content);
  } catch (err) {
    console.error('ERROR:', err.message, 'status:', err.status);
  }
  
  console.log('Test 2: Check available models');
  try {
    const models = await client.models.list();
    console.log('Models:', models.data.map(m => m.id).join(', '));
  } catch (err) {
    console.error('Models list ERROR:', err.message, 'status:', err.status);
  }
}

main().catch(console.error);
