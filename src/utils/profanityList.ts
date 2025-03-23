/**
 * Comprehensive Profanity Word List
 * 
 * This file contains an extensive list of profane words and variations
 * to be used by the profanity filter. The list includes common variations,
 * misspellings, and evasion tactics.
 * 
 * NOTE: This is a sanitized representation with only a small sample of the actual list.
 * In a real implementation, this would contain 1000+ entries.
 */

// Using a Set for O(1) lookups
const buildProfanityList = (): string[] => {
  // Safe words that should never be flagged, even if they contain substrings that look like profanity
  const safeWords = [
    'test', 'testing', 'testy', 'contest', 'protest', 'testify', 'testimony', 'testament', 'testable',
    'analysis', 'analyze', 'analytical', 'analyst', 'analyses', 'analyzing',  
    'assist', 'assistant', 'assisted', 'assisting', 'assistance', 'associate', 'association',
    'class', 'classic', 'classical', 'classify', 'classification', 'classes',
    'assess', 'assessed', 'assessing', 'assessment', 'assets', 'assignment', 'assign', 'assigned',
    'assume', 'assumed', 'assuming', 'assumption', 'assumptions',
    'passport', 'massachusetts', 'cassette', 'assemble', 'assembled', 'assembling', 'assembly',
    'glasses', 'grass', 'brass', 'therapist', 'pass', 'passing', 'passed', 'passenger',
    'bassist', 'chassis', 'harassment', 'embarrass', 'embarrassing', 'embassy',
    'sassy', 'grassy', 'sass', 'sassing', 'masse', 'lassie', 'hassle',
    'cockatoo', 'cockatiel', 'cocktail', 'peacock', 'hancock', 'hitchcock', 'woodcock',
    'hellenic', 'shellfish', 'hello', 'hellos', 'hell-bent',
    'mass', 'masses', 'massive', 'bass', 'bassoon', 'carcass', 'sass', 'hassle',
    'assassin', 'sassafras', 'casserole', 'assay', 'assail', 'amass', 'cuirass', 'bagasse',
    'canal', 'canals', 'banal', 'analysis', 'analyses', 'analyst'
  ];
  
  // Core profanity list - Major words only for this example
  // Simplified list to reduce risk of regex parsing errors
  const baseList = [
    'anal', 'anus', 'arse', 'ass', 'bastard', 'bitch', 'biatch', 
    'blowjob', 'bollock', 'bollok', 'boner', 'boob', 'bugger', 
    'bum', 'butt', 'cunt', 'damn', 'dick', 'dildo', 'dyke', 'fag', 'feck', 
    'fellatio', 'fuck', 'goddamn', 'homo', 'jizz', 'knobend', 'labia', 'muff', 
    'nigger', 'nigga', 'penis', 'piss', 'poop', 'prick', 'pube', 'pussy', 'queer', 
    'scrotum', 'shit', 'slut', 'smegma', 'spunk', 'tit', 'tosser', 
    'turd', 'twat', 'vagina', 'wank', 'whore'
  ];

  // Sanitize words for regex safety - remove any special characters that could cause regex syntax errors
  const sanitizedBaseList = baseList.map(word => {
    // Remove any characters that are problematic for regex
    return word.replace(/[.*+?^${}()|[\]\\]/g, '');
  });

  // Filter out any words that might be in both lists - safe words take priority
  const filteredBaseList = sanitizedBaseList.filter(word => 
    !safeWords.some(safe => 
      word.toLowerCase() === safe.toLowerCase() || 
      safe.toLowerCase().includes(word.toLowerCase())
    )
  );

  // This would be 1000+ words in a real implementation
  const expandedList: string[] = [];

  // Add base words
  filteredBaseList.forEach(word => {
    // Skip empty words or words with fewer than 2 characters
    if (!word || word.length < 2) return;
    
    expandedList.push(word);
    
    // Add common prefixes and suffixes
    expandedList.push(`${word}s`);      // plurals
    expandedList.push(`${word}er`);     // noun forms
    expandedList.push(`${word}ing`);    // gerund forms
    expandedList.push(`${word}ed`);     // past tense
    
    // Add common variations to catch evasion attempts - safely replacing characters
    try {
      expandedList.push(word.replace(/a/g, '@'));
      expandedList.push(word.replace(/i/g, '1'));
      expandedList.push(word.replace(/i/g, '!'));
      expandedList.push(word.replace(/o/g, '0'));
      expandedList.push(word.replace(/s/g, '$'));
      expandedList.push(word.replace(/e/g, '3'));
      expandedList.push(word.replace(/a/g, '4'));
    } catch (e) {
      console.error('Error generating letter replacements:', e);
    }
    
    // Catching word with separators - using try/catch for safety
    try {
      expandedList.push(word.split('').join('.'));  // f.u.c.k
      expandedList.push(word.split('').join('-'));  // f-u-c-k
      expandedList.push(word.split('').join('_'));  // f_u_c_k
      expandedList.push(word.split('').join(' '));  // f u c k
    } catch (e) {
      console.error('Error generating separator variations:', e);
    }
    
    // Common letter substitutions
    try {
      if (word.includes('ck')) {
        expandedList.push(word.replace('ck', 'kk'));  // fukk
      }
    } catch (e) {
      console.error('Error generating substitutions:', e);
    }
    
    // Simplified leetspeak generation - focusing on the most common substitutions only
    try {
      // Replace 'a' with '4'
      if (word.includes('a')) expandedList.push(word.replace(/a/g, '4'));
      
      // Replace 'e' with '3'
      if (word.includes('e')) expandedList.push(word.replace(/e/g, '3'));
      
      // Replace 'i' with '1'
      if (word.includes('i')) expandedList.push(word.replace(/i/g, '1'));
      
      // Replace 'o' with '0'
      if (word.includes('o')) expandedList.push(word.replace(/o/g, '0'));
      
      // Replace 's' with '5'
      if (word.includes('s')) expandedList.push(word.replace(/s/g, '5'));
    } catch (e) {
      console.error('Error generating leetspeak variations:', e);
    }
  });
  
  // Final safety check: Remove duplicates, empty strings, and ensure safe words are not included
  const uniqueList = [...new Set(expandedList)].filter(word => word && word.length >= 2);
  
  return uniqueList.filter(word => 
    !safeWords.some(safe => 
      word.toLowerCase() === safe.toLowerCase() || // Exact match
      safe.toLowerCase() === word.toLowerCase() || // Same word different case
      (safe.length > 3 && word.toLowerCase().includes(safe.toLowerCase())) // Safe word is substring of profane word
    )
  );
};

// Export the profanity list for use in the filter
export const PROFANE_WORDS = buildProfanityList(); 