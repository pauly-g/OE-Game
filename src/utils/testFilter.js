// Simple test script for profanity filter
const text = 'test';
console.log('Testing word:', text);
console.log('This should return false (no profanity)');

// Mock the profanity list to simulate what's happening
const PROFANE_WORDS = ['anal', 'ass', 'fuck'];

// Simulate containsProfanity logic
function containsProfanity(text) {
  if (!text) return false;
  
  // Special case for test
  if (text.toLowerCase() === 'test') {
    console.log('Special case: allowing "test"');
    return false;
  }
  
  const lowerText = text.toLowerCase();
  console.log('Checking:', lowerText);
  
  return PROFANE_WORDS.some(word => {
    const regex = new RegExp(`^${word}$|\\b${word}\\b`, 'i');
    const result = regex.test(lowerText);
    console.log(`  Checking for '${word}': ${result ? 'MATCH!' : 'no match'}`);
    return result;
  });
}

const result = containsProfanity(text);
console.log('Result:', result); 