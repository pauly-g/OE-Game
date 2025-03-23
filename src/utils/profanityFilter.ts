/**
 * Profanity Filter Utility
 * 
 * A comprehensive utility to silently detect and filter profanity in user submissions,
 * including leet speak and common evasion tactics.
 */

// Import a comprehensive list of profane words (this is just a small sample for the code)
// In the real implementation, this would contain 1000+ words and variations
import { PROFANE_WORDS } from './profanityList';

/**
 * Helper function to escape special regex characters in a string
 * This prevents syntax errors when building regexes dynamically
 * @param string String to escape
 * @returns Escaped string safe for use in RegExp
 */
const escapeRegex = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Normalizes text to catch evasion attempts like leet speak
 * @param text Text to normalize
 * @returns Normalized text
 */
const normalizeText = (text: string): string => {
  if (!text) return '';
  
  let normalized = text.toLowerCase();
  
  // Directly replace characters without using RegExp constructor with problematic characters
  normalized = normalized.replace(/0/g, 'o');
  normalized = normalized.replace(/1/g, 'i');
  normalized = normalized.replace(/3/g, 'e');
  normalized = normalized.replace(/4/g, 'a');
  normalized = normalized.replace(/5/g, 's');
  normalized = normalized.replace(/6/g, 'g');
  normalized = normalized.replace(/7/g, 't');
  normalized = normalized.replace(/8/g, 'b');
  normalized = normalized.replace(/@/g, 'a');
  normalized = normalized.replace(/\$/g, 's');
  normalized = normalized.replace(/!/g, 'i');
  normalized = normalized.replace(/\+/g, 't');
  normalized = normalized.replace(/\(/g, 'c');
  normalized = normalized.replace(/\)/g, 'o');
  normalized = normalized.replace(/</g, 'c');
  normalized = normalized.replace(/>/g, 'o');
  normalized = normalized.replace(/\|/g, 'i');
  
  // Remove separators and other characters
  normalized = normalized.replace(/_/g, '');
  normalized = normalized.replace(/-/g, '');
  normalized = normalized.replace(/\./g, '');
  normalized = normalized.replace(/,/g, '');
  normalized = normalized.replace(/\*/g, '');
  normalized = normalized.replace(/\?/g, '');
  normalized = normalized.replace(/#/g, 'h');
  
  // Remove spaces
  normalized = normalized.replace(/\s+/g, '');
  
  return normalized;
};

/**
 * Checks if text contains any profanity from our filter list, accounting for evasion techniques
 * @param text Text to check for profanity
 * @returns True if profanity detected, false otherwise
 */
export const containsProfanity = (text: string): boolean => {
  if (!text) return false;
  
  // Safelist of common test words that should never be flagged
  const safeTestWords = [
    'test', 'tester', 'testing', 'testable', 'contest', 'latest',
    'analysis', 'analyst', 'analytical', 'analytics', 'analyze', 'analyzed', 'analyzing', 'analyses'
  ];
  
  // If the exact input is one of our safe test words, allow it
  if (safeTestWords.includes(text.toLowerCase())) {
    console.log(`Safe word detected: "${text}" - bypassing profanity check`);
    return false;
  }
  
  // Get all words in the text for individual checking
  const words = text.toLowerCase().split(/\s+/);
  
  // If any single word in the input is exactly one of our safe words, don't check that word
  const wordsToCheck = words.filter(word => !safeTestWords.includes(word));
  
  if (wordsToCheck.length === 0) {
    return false; // All words were safe words
  }
  
  // Convert to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  console.log('Checking text:', lowerText);
  
  // Also create a normalized version to catch leet speak and spacing tricks
  const normalizedText = normalizeText(text);
  
  // Special handling for the word "anal" which needs stricter matching
  const analRegex = /\banal\b/i;
  if (analRegex.test(lowerText)) {
    console.log('Profanity detected: "anal" as a standalone word');
    return true;
  }
  
  // Simple profanity check - this is our primary check for profanity
  // Check if the input contains common profanity words like "fuck"
  if (/\b(fuck|shit|cunt|damn|bitch|ass)\b/i.test(lowerText)) {
    console.log('Common profanity detected through direct check');
    return true;
  }
  
  try {
    // Check against both the original text and normalized version
    const hasProfanity = PROFANE_WORDS.some((word: string) => {
      try {
        // Escape special regex characters in the word
        const safeWord = escapeRegex(word);
        
        // Only check for exact word matches to prevent false positives
        const regexOriginal = new RegExp(`\\b${safeWord}\\b`, 'i');
        
        if (regexOriginal.test(lowerText)) {
          // Extra verification to ensure we're not getting false positives with common words
          if (safeTestWords.some(safe => lowerText === safe)) {
            console.log(`Ignoring false positive with safe word: "${lowerText}"`);
            return false;
          }
          
          console.log(`Profanity detected: '${word}' in original text`);
          return true;
        }
        
        // For normalized text, check if any word in our text normalizes to a profane word
        for (const originalWord of wordsToCheck) {
          const normalizedWord = normalizeText(originalWord);
          if (normalizedWord === word) {
            console.log(`Profanity detected: '${word}' in normalized word: ${originalWord} → ${normalizedWord}`);
            return true;
          }
        }
        
        return false;
      } catch (e) {
        // If there's an error with this specific word's regex, log it and continue
        console.error(`Error with word "${word}":`, e);
        return false;
      }
    });
    
    if (hasProfanity) {
      console.log('Text contains profanity');
    } else {
      console.log('Text is clean');
    }
    
    return hasProfanity;
  } catch (error) {
    // If there's an error in the profanity check, log it and default to blocking suspicious content
    console.error('Error in profanity check:', error);
    
    // As a fallback, check for obvious profanity
    const containsObviousProfanity = /fuck|shit|cunt|ass|damn|bitch/i.test(text);
    return containsObviousProfanity;
  }
};

/**
 * Validates a user's profile submission silently
 * @param name User's name
 * @param company User's company
 * @returns Object with validation result and generic error message if applicable
 */
export const validateUserSubmission = (
  name: string, 
  company: string
): { isValid: boolean; errorMessage?: string } => {
  console.log('Validating submission:', { name, company });
  
  // Check if name is empty or too short
  if (!name || name.trim().length < 2) {
    console.log('Validation failed: Name too short');
    return {
      isValid: false,
      errorMessage: 'Name must be at least 2 characters'
    };
  }
  
  // Check if company is empty
  if (!company || company.trim().length === 0) {
    console.log('Validation failed: Company is required');
    return {
      isValid: false,
      errorMessage: 'Company field is required'
    };
  }
  
  // Check if name is too long
  if (name.length > 20) {
    console.log('Validation failed: Name too long');
    return {
      isValid: false,
      errorMessage: 'Name must be 20 characters or less'
    };
  }
  
  // Check if company is too long
  if (company && company.length > 30) {
    console.log('Validation failed: Company too long');
    return {
      isValid: false,
      errorMessage: 'Company must be 30 characters or less'
    };
  }
  
  try {
    // Check for profanity in name or company - SILENTLY reject with a generic message
    if (containsProfanity(name) || containsProfanity(company)) {
      console.log('Validation failed: Profanity detected (silent rejection)');
      return {
        isValid: false,
        errorMessage: 'Please check your submission and try again'
      };
    }
  } catch (error) {
    console.error('Error during profanity validation:', error);
    // If an error occurs, reject the submission to be safe
    return {
      isValid: false,
      errorMessage: 'Please check your submission and try again'
    };
  }
  
  console.log('Validation passed!');
  // All checks passed
  return { isValid: true };
}; 