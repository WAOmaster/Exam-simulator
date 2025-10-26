const mammoth = require('mammoth');
const path = require('path');

async function inspectDocx() {
  try {
    const docxPath = path.join(__dirname, '../public/questions.docx');
    const result = await mammoth.extractRawText({ path: docxPath });
    const text = result.value;

    console.log('📄 First 2000 characters of the document:');
    console.log('=' .repeat(80));
    console.log(text.substring(0, 2000));
    console.log('=' .repeat(80));
    console.log(`\n📊 Total length: ${text.length} characters`);

    // Save full text for inspection
    const fs = require('fs');
    fs.writeFileSync(path.join(__dirname, '../data/raw-text.txt'), text);
    console.log('💾 Full text saved to data/raw-text.txt');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

inspectDocx();
