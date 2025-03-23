/**
 * Utility to test the profanity filter against common inputs
 */
import { containsProfanity, validateUserSubmission } from './profanityFilter';

/**
 * Test a series of words against the profanity filter
 */
export const testProfanityFilter = () => {
  console.log('===== TESTING PROFANITY FILTER =====');
  
  // Test cases that should pass (no profanity)
  const cleanWords = [
    'Test',
    'Testing',
    'Assignment',
    'Analyst',
    'Analysis',
    'Class',
    'Massachusetts',
    'Associate',
    'Assist',
    'Hello',
    'Assess',
    'Assets',
    'Pass',
    'Github',
    'Hancock',
    'Cocktail',
    'Peacock'
  ];
  
  // Test cases that should fail (contain profanity)
  const profaneWords = [
    'fuck',
    'f u c k',
    'f.u.c.k',
    'fük',
    'sh1t',
    'a$$',
    '@ss',
    'b!tch'
  ];
  
  console.log('\n--- TESTING CLEAN WORDS (SHOULD ALL PASS) ---');
  cleanWords.forEach(word => {
    const isProfane = containsProfanity(word);
    console.log(`"${word}": ${isProfane ? '❌ FALSE POSITIVE' : '✅ PASSED'}`);
  });
  
  console.log('\n--- TESTING PROFANE WORDS (SHOULD ALL FAIL) ---');
  profaneWords.forEach(word => {
    const isProfane = containsProfanity(word);
    console.log(`"${word}": ${isProfane ? '✅ CAUGHT' : '❌ FALSE NEGATIVE'}`);
  });
  
  console.log('\n--- TESTING VALIDATION FUNCTION ---');
  console.log('Valid submission:', validateUserSubmission('John', 'Acme Corp'));
  console.log('Profane name:', validateUserSubmission('Fuck', 'Acme Corp'));
  console.log('Profane company:', validateUserSubmission('John', 'Fucking Company'));
  
  console.log('\n===== PROFANITY FILTER TEST COMPLETE =====');
};

// Uncomment to run the test immediately when this file is imported
// testProfanityFilter(); 