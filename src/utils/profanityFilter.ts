/**
 * Profanity Filter Utility
 * 
 * A comprehensive utility to silently detect and filter profanity in user submissions,
 * including leet speak and common evasion tactics, competitor names, and negative business content.
 */

// Import the profanity-cleaner library for additional checking
import * as profanityCleaner from 'profanity-cleaner';
import { logProfanityDetection } from './securityMonitor';

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
  normalized = normalized.replace(/\*/g, '');
  
  // Remove separators and other characters
  normalized = normalized.replace(/_/g, '');
  normalized = normalized.replace(/-/g, '');
  normalized = normalized.replace(/\./g, '');
  normalized = normalized.replace(/,/g, '');
  normalized = normalized.replace(/\?/g, '');
  normalized = normalized.replace(/#/g, 'h');
  
  // Remove spaces
  normalized = normalized.replace(/\s+/g, '');
  
  return normalized;
};

/**
 * Check for competitor names and negative business phrases
 * @param text Text to check
 * @returns True if contains competitor content or negative business phrases
 */
const containsCompetitorContent = (text: string): boolean => {
  if (!text) return false;
  
  const lowerText = text.toLowerCase().trim();
  
  // Specific competitor patterns
  const competitorPatterns = [
    /\b(hulk|shoppad|orderdesk|orderhive|ordermetrics|orderprinter|ordersify|ordertify|editify)\b/i,
    /\b(cartboost|upsellify|crosssell|oneclick|clickfunnels|reconvert|zipify|honeycomb|rebuy|bold|vitals)\b/i,
    /\b(edit\s*order|modify\s*order|change\s*order|update\s*order|revise\s*order|amend\s*order)\b/i,
    /\b(alternative|competitor|competing|better\s*than|worse\s*than|instead\s*of|replacement\s*for)\b/i,
    /\b(dont\s*use|don't\s*use|avoid|stay\s*away)\b/i
  ];
  
  for (const pattern of competitorPatterns) {
    if (pattern.test(lowerText)) {
      console.log(`Competitor content detected: pattern matched in "${text}"`);
      return true;
    }
  }
  
  // Negative business phrases specifically about Order Editing
  const negativePatterns = [
    /\border\s*editing\s*(sucks|is\s*bad|is\s*terrible|is\s*awful|is\s*horrible|is\s*worst|is\s*useless|is\s*worthless|is\s*garbage|is\s*trash|is\s*junk|is\s*crap|is\s*poo|is\s*shit)/i,
    /\b(overpriced|expensive|costly|too\s*much|rip\s*off|ripoff|scam|fraud|steal|stolen)\b/i,
    /\b(buggy|broken|doesnt\s*work|doesn't\s*work|not\s*working|slow|laggy|crashes|freezes|unreliable)\b/i,
    /\b(bad\s*support|poor\s*support|no\s*help|unhelpful|waste\s*of\s*money|waste\s*money|not\s*worth)\b/i
  ];
  
  for (const pattern of negativePatterns) {
    if (pattern.test(lowerText)) {
      console.log(`Negative business content detected: pattern matched in "${text}"`);
      return true;
    }
  }
  
  return false;
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
    'order editing', 'orderediting', 'order-editing',
    'test', 'tester', 'testing', 'testable', 'contest', 'latest',
    'analysis', 'analyst', 'analytical', 'analytics', 'analyze', 'analyzed', 'analyzing', 'analyses'
  ];
  
  // If the exact input is one of our safe test words, allow it
  if (safeTestWords.includes(text.toLowerCase().trim())) {
    console.log(`Safe word detected: "${text}" - bypassing profanity check`);
    return false;
  }
  
  // Special handling for "Order Editing" - allow it by itself but not with negative words
  const orderEditingPattern = /^order\s*editing$/i;
  if (orderEditingPattern.test(text.trim())) {
    console.log(`"Order Editing" detected as standalone - allowing`);
    return false;
  }
  
  // Check for competitor content first
  if (containsCompetitorContent(text)) {
    logProfanityDetection(text);
    return true;
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
    logProfanityDetection(text);
    return true;
  }
  
  // Enhanced profanity check - explicitly check for common profanity including "poo"
  const explicitProfanityWords = [
    'fuck', 'shit', 'bullshit', 'cunt', 'damn', 'bitch', 'ass', 'asshole',
    'bastard', 'piss', 'cock', 'dick', 'pussy', 'whore', 'slut',
    'poo', 'poop', 'crap', 'fart', 'butt', 'stupid', 'idiot', 'moron', 'dumb', 'loser'
  ];
  
  for (const word of explicitProfanityWords) {
    const wordRegex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    if (wordRegex.test(lowerText)) {
      console.log(`Explicit profanity detected: "${word}"`);
      logProfanityDetection(text);
      return true;
    }
  }
  
  // Use profanity-cleaner library as additional check
  try {
    if (profanityCleaner.isProfane(text)) {
      console.log('Profanity detected by profanity-cleaner library');
      logProfanityDetection(text);
      return true;
    }
  } catch (error) {
    console.error('Error using profanity-cleaner library:', error);
    // Continue with our own checks if library fails
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
          if (normalizedWord === word.toLowerCase()) {
            console.log(`Profanity detected: '${word}' in normalized word: ${originalWord} → ${normalizedWord}`);
            return true;
          }
        }
        
        // Check for partial matches in longer text (for spaced out words)
        const spacedText = lowerText.replace(/\s+/g, '');
        if (spacedText.includes(word.toLowerCase()) && word.length > 3) {
          console.log(`Profanity detected: '${word}' in spaced text: ${spacedText}`);
          return true;
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
    
    // As a fallback, check for obvious profanity including bullshit and poo
    const containsObviousProfanity = /\b(fuck|shit|bullshit|cunt|ass|damn|bitch|poo|crap|stupid|idiot)\b/i.test(text);
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

  // Check for profanity in name
  if (containsProfanity(name)) {
    console.log('Validation failed: Name contains profanity');
    return {
      isValid: false,
      errorMessage: 'Please enter an appropriate name'
    };
  }
  
  // Check for profanity in company
  if (containsProfanity(company)) {
    console.log('Validation failed: Company contains profanity or inappropriate content');
    return {
      isValid: false,
      errorMessage: 'Please enter an appropriate company name'
    };
  }
  
  // Check for URLs in company name
  const urlPattern = /(https?:\/\/|www\.)/i;
  if (urlPattern.test(company)) {
    console.log('Validation failed: Company contains URL');
    return {
      isValid: false,
      errorMessage: 'Company name cannot contain web addresses'
    };
  }
  
  console.log('Validation passed: All checks successful');
  return {
    isValid: true
  };
}; 