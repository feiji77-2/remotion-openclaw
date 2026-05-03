const dotenv = require('dotenv');
dotenv.config();

const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: 'https://api.minimaxi.com/v1',
  timeout: 60000,
});

async function main() {
  console.log('Testing LLM call with same params as pipeline...');
  
  try {
    // This is similar to what pipeline does
    const messages = [{ role: 'user', content: 'Return JSON with thesis (string), audience (string), corePromise (string), layers (array), process (array) for topic: xiaomi mimo2.5' }];
    
    const response = await client.chat.completions.create({
      model: 'MiniMax-M2.7',
      temperature: 0.55,
      top_p: 1,
      messages: messages,
      extra_body: { reasoning_split: true }
    });
    
    console.log('Response content:', response.choices[0].message.content);
    console.log('---');
    console.log('Raw response:', JSON.stringify(response, null, 2));
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('STATUS:', err.status);
  }
}

main().catch(console.error);
