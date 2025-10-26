const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API...\n');

  try {
    // Check if API key is loaded
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('❌ GEMINI_API_KEY not found in .env.local');
      console.log('Please make sure .env.local exists and contains your API key.');
      return;
    }

    console.log('✅ API key found:', apiKey.substring(0, 20) + '...');

    // Initialize Gemini (using gemini-2.5-flash which is free and fast)
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    console.log('✅ Gemini client initialized\n');

    // Test prompt
    const testPrompt = `You are an Oracle Cloud Infrastructure (OCI) expert. Briefly explain what OCI Autonomous Database is in 2-3 sentences.`;

    console.log('🔄 Sending test request...');
    const result = await model.generateContent(testPrompt);
    const response = await result.response;
    const text = response.text();

    console.log('\n✅ API Response received!\n');
    console.log('📝 Test Response:');
    console.log('─'.repeat(60));
    console.log(text);
    console.log('─'.repeat(60));

    console.log('\n🎉 Success! Gemini API is working correctly!');
    console.log('\n✨ Your exam simulator is ready to use with AI explanations.');

  } catch (error) {
    console.error('\n❌ Error testing Gemini API:');
    console.error(error.message);

    if (error.message.includes('API_KEY_INVALID')) {
      console.log('\n💡 Your API key appears to be invalid.');
      console.log('Please check: https://makersuite.google.com/app/apikey');
    } else if (error.message.includes('quota')) {
      console.log('\n💡 You may have exceeded your API quota.');
      console.log('Free tier: 15 requests/min, 1500 requests/day');
    }
  }
}

testGeminiAPI();
