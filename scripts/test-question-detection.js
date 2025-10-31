// Test script to verify question detection logic

const sampleContent = `
1. What is Oracle Cloud Infrastructure?
A. A cloud service
B. A database
C. A network
D. An application

Correct Answer: A

2. Which service provides compute resources?
A. OCI Compute
B. OCI Storage
C. OCI Network
D. OCI Database

Correct Answer: A

3. What is a VCN in OCI?

4. How does load balancing work?

5. What is object storage used for?
`;

// Copy the estimateQuestionCount function
function estimateQuestionCount(content) {
  const patterns = [
    /^\s*\d+\.\s+[A-Z]/gm,           // "1. Question" (must have letter after)
    /^\s*Question\s*\d+/gim,         // "Question 1"
    /^\s*Q\d+[\.:]\s*/gim,           // "Q1:" or "Q1."
    /^\s*\d+\)\s+[A-Z]/gm,           // "1) Question"
  ];

  let maxCount = 0;
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      const count = matches.length;
      console.log(`Pattern ${pattern.source} found ${count} matches`);
      maxCount = Math.max(maxCount, count);
    }
  }

  console.log(`\nEstimated question count: ${maxCount}`);
  return maxCount || 10;
}

console.log('Testing question detection...\n');
console.log('Sample content:');
console.log(sampleContent);
console.log('\n--- Detection Results ---\n');

const count = estimateQuestionCount(sampleContent);

console.log(`\n✓ Detected ${count} questions`);
console.log(`Expected: 5 questions`);

if (count === 5) {
  console.log('\n✅ Test PASSED!');
} else {
  console.log('\n❌ Test FAILED! Detection is not accurate.');
}
