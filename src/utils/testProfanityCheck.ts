// Test script for profanity filter (TypeScript version)
import { containsProfanity } from './profanityFilter';

// Test cases
interface TestCase {
  input: string;
  expected: boolean;
  description: string;
}

const testCases: TestCase[] = [
  { input: 'anal', expected: true, description: 'Should detect "anal" as profanity' },
  { input: 'ANAL', expected: true, description: 'Should detect uppercase "ANAL" as profanity' },
  { input: 'analysis', expected: false, description: 'Should allow "analysis" as safe' },
  { input: 'I am analyzing data', expected: false, description: 'Should allow "analyzing" as safe' },
  { input: 'the analyst said', expected: false, description: 'Should allow "analyst" as safe' },
  { input: 'canal boat', expected: false, description: 'Should allow "canal" as safe' },
  { input: 'It seems banal', expected: false, description: 'Should allow "banal" as safe' },
  { input: 'Behavioral analysis', expected: false, description: 'Should allow compound with "analysis"' },
  { input: 'anal ysis', expected: true, description: 'Should detect "anal" with space evasion' },
  { input: 'an al', expected: false, description: 'Should not detect "an al" (split word)' },
  { input: 'an4l', expected: true, description: 'Should detect leetspeak "an4l"' },
  { input: 'a.n.a.l', expected: true, description: 'Should detect "a.n.a.l" with separators' },
  { input: 'I am an analytical person', expected: false, description: 'Should allow "analytical" in a sentence' },
  { input: 'The meeting was totally anal about details', expected: true, description: 'Should detect "anal" in a sentence' },
];

// Run the tests
console.log('TESTING PROFANITY FILTER');
console.log('========================');

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`\nTest #${index + 1}: ${testCase.description}`);
  console.log(`Input: "${testCase.input}"`);
  
  try {
    const result = containsProfanity(testCase.input);
    console.log(`Result: ${result}`);
    
    if (result === testCase.expected) {
      console.log('✅ PASSED');
      passedTests++;
    } else {
      console.log(`❌ FAILED - Expected ${testCase.expected}, got ${result}`);
      failedTests++;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
    failedTests++;
  }
});

console.log('\n========================');
console.log(`SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log('========================');

// No need for process.exit in TypeScript web context 