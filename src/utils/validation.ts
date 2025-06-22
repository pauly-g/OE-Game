/**
 * Input Validation Utility
 * 
 * Provides comprehensive validation for all user inputs to prevent injection attacks,
 * data corruption, and abuse. This complements the existing profanity filter.
 */

// Constants for validation rules
export const VALIDATION_CONSTANTS = {
  SCORE: {
    MIN: 0,
    MAX: 1000000, // Reasonable maximum score for the game
    DECIMAL_PLACES: 0 // Scores should be integers
  },
  COMPANY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100,
    ALLOWED_CHARS: /^[a-zA-Z0-9\s\-\.,'&()]+$/
  },
  DISPLAY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50,
    ALLOWED_CHARS: /^[a-zA-Z0-9\s\-\.,']+$/
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_LENGTH: 254
  }
} as const;

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string | number;
}

/**
 * Sanitize a string by removing potentially dangerous characters
 */
const sanitizeString = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    // Remove null bytes and control characters
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Remove potential script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove other potentially dangerous HTML tags
    .replace(/<(?:iframe|object|embed|form|input|meta|link)\b[^>]*>/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Validate and sanitize a score value
 */
export const validateScore = (score: unknown): ValidationResult => {
  // Check if score exists
  if (score === null || score === undefined) {
    return {
      isValid: false,
      error: 'Score is required'
    };
  }

  // Convert to number if it's a string
  const numScore = typeof score === 'string' ? parseFloat(score) : Number(score);

  // Check if it's a valid number
  if (isNaN(numScore) || !isFinite(numScore)) {
    return {
      isValid: false,
      error: 'Score must be a valid number'
    };
  }

  // Check range
  if (numScore < VALIDATION_CONSTANTS.SCORE.MIN) {
    return {
      isValid: false,
      error: `Score cannot be negative`
    };
  }

  if (numScore > VALIDATION_CONSTANTS.SCORE.MAX) {
    return {
      isValid: false,
      error: `Score cannot exceed ${VALIDATION_CONSTANTS.SCORE.MAX.toLocaleString()}`
    };
  }

  // Check if it's an integer (no decimal places for scores)
  if (numScore % 1 !== 0) {
    return {
      isValid: false,
      error: 'Score must be a whole number'
    };
  }

  return {
    isValid: true,
    sanitizedValue: Math.floor(numScore) // Ensure it's an integer
  };
};

/**
 * Validate and sanitize a company name
 */
export const validateCompanyName = (company: unknown): ValidationResult => {
  if (!company || typeof company !== 'string') {
    return {
      isValid: false,
      error: 'Company name is required'
    };
  }

  const sanitized = sanitizeString(company);

  if (sanitized.length < VALIDATION_CONSTANTS.COMPANY_NAME.MIN_LENGTH) {
    return {
      isValid: false,
      error: 'Company name is required'
    };
  }

  if (sanitized.length > VALIDATION_CONSTANTS.COMPANY_NAME.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Company name cannot exceed ${VALIDATION_CONSTANTS.COMPANY_NAME.MAX_LENGTH} characters`
    };
  }

  if (!VALIDATION_CONSTANTS.COMPANY_NAME.ALLOWED_CHARS.test(sanitized)) {
    return {
      isValid: false,
      error: 'Company name contains invalid characters'
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitized
  };
};

/**
 * Validate and sanitize a display name
 */
export const validateDisplayName = (name: unknown): ValidationResult => {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Display name is required'
    };
  }

  const sanitized = sanitizeString(name);

  if (sanitized.length < VALIDATION_CONSTANTS.DISPLAY_NAME.MIN_LENGTH) {
    return {
      isValid: false,
      error: 'Display name is required'
    };
  }

  if (sanitized.length > VALIDATION_CONSTANTS.DISPLAY_NAME.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Display name cannot exceed ${VALIDATION_CONSTANTS.DISPLAY_NAME.MAX_LENGTH} characters`
    };
  }

  if (!VALIDATION_CONSTANTS.DISPLAY_NAME.ALLOWED_CHARS.test(sanitized)) {
    return {
      isValid: false,
      error: 'Display name contains invalid characters'
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitized
  };
};

/**
 * Validate an email address
 */
export const validateEmail = (email: unknown): ValidationResult => {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email address is required'
    };
  }

  const sanitized = sanitizeString(email);

  if (sanitized.length > VALIDATION_CONSTANTS.EMAIL.MAX_LENGTH) {
    return {
      isValid: false,
      error: 'Email address is too long'
    };
  }

  if (!VALIDATION_CONSTANTS.EMAIL.PATTERN.test(sanitized)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address'
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitized.toLowerCase()
  };
};

/**
 * Validate a user ID (for internal use)
 */
export const validateUserId = (userId: unknown): ValidationResult => {
  if (!userId || typeof userId !== 'string') {
    return {
      isValid: false,
      error: 'User ID is required'
    };
  }

  const sanitized = userId.trim();

  if (sanitized.length === 0) {
    return {
      isValid: false,
      error: 'User ID cannot be empty'
    };
  }

  // User IDs should only contain alphanumeric characters and hyphens (Firebase UID format)
  if (!/^[a-zA-Z0-9\-_]+$/.test(sanitized)) {
    return {
      isValid: false,
      error: 'Invalid user ID format'
    };
  }

  return {
    isValid: true,
    sanitizedValue: sanitized
  };
};

/**
 * Comprehensive validation for score submission data
 */
export const validateScoreSubmission = (data: {
  userId: unknown;
  score: unknown;
  displayName?: unknown;
  company?: unknown;
}): ValidationResult & { sanitizedData?: any } => {
  // Validate user ID
  const userIdValidation = validateUserId(data.userId);
  if (!userIdValidation.isValid) {
    return {
      isValid: false,
      error: `User validation failed: ${userIdValidation.error}`
    };
  }

  // Validate score
  const scoreValidation = validateScore(data.score);
  if (!scoreValidation.isValid) {
    return {
      isValid: false,
      error: `Score validation failed: ${scoreValidation.error}`
    };
  }

  // Validate optional display name
  let sanitizedDisplayName = null;
  if (data.displayName) {
    const nameValidation = validateDisplayName(data.displayName);
    if (!nameValidation.isValid) {
      return {
        isValid: false,
        error: `Display name validation failed: ${nameValidation.error}`
      };
    }
    sanitizedDisplayName = nameValidation.sanitizedValue;
  }

  // Validate optional company
  let sanitizedCompany = null;
  if (data.company) {
    const companyValidation = validateCompanyName(data.company);
    if (!companyValidation.isValid) {
      return {
        isValid: false,
        error: `Company validation failed: ${companyValidation.error}`
      };
    }
    sanitizedCompany = companyValidation.sanitizedValue;
  }

  return {
    isValid: true,
    sanitizedData: {
      userId: userIdValidation.sanitizedValue,
      score: scoreValidation.sanitizedValue,
      displayName: sanitizedDisplayName,
      company: sanitizedCompany
    }
  };
};

/**
 * Detect potential injection attempts in input
 */
export const detectInjectionAttempt = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;

  const suspiciousPatterns = [
    // SQL injection patterns
    /('|(\\')|(;|\\;)|(--|\\--)|(\/\*|\\\/))/i,
    // Script injection patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // Common XSS patterns
    /javascript:|vbscript:|onload=|onerror=|onclick=/i,
    // Command injection patterns
    /(\||&|;|\$\(|\`)/,
    // Path traversal
    /\.\.(\/|\\)/,
    // Null bytes
    /\x00/
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
};

/**
 * Log security events for monitoring
 */
export const logSecurityEvent = (
  eventType: 'VALIDATION_FAILED' | 'INJECTION_ATTEMPT' | 'RATE_LIMIT_HIT' | 'SUSPICIOUS_INPUT',
  details: {
    userId?: string;
    input?: string;
    error?: string;
    timestamp?: Date;
  }
): void => {
  const logEntry = {
    type: eventType,
    timestamp: details.timestamp || new Date(),
    userId: details.userId || 'anonymous',
    error: details.error,
    // Don't log the actual suspicious input for security reasons
    hasInput: !!details.input,
    inputLength: details.input?.length || 0
  };

  console.warn('[SECURITY EVENT]', logEntry);

  // In a production environment, you would send this to a security monitoring service
  // Example: securityMonitoring.logEvent(logEntry);
}; 