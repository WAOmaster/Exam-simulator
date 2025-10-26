const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  console.log('📋 Listing available Gemini models...\n');

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found');
      return;
    }

    console.log('✅ API key loaded:', apiKey.substring(0, 20) + '...\n');

    const genAI = new GoogleGenerativeAI(apiKey);

    console.log('🔄 Fetching available models...\n');

    // Try to list models
    const models = await genAI.listModels();

    console.log('✅ Available models:\n');
    for await (const model of models) {
      console.log('📦 Model:', model.name);
      console.log('   Display Name:', model.displayName);
      console.log('   Supported Methods:', model.supportedGenerationMethods?.join(', '));
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error listing models:');
    console.error(error.message);

    console.log('\n💡 This might indicate:');
    console.log('   1. API key is invalid or expired');
    console.log('   2. API key doesn\'t have proper permissions');
    console.log('   3. Gemini API is not enabled for this key');
    console.log('\n🔗 Please verify your API key at:');
    console.log('   https://makersuite.google.com/app/apikey');
    console.log('   or');
    console.log('   https://aistudio.google.com/app/apikey');
  }
}

listModels();
