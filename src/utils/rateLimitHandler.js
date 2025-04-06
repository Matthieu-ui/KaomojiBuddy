const logger = require('./logger');
const config = require('../config');

/**
 * Handles rate limiting for Twitter API calls
 * Implements exponential backoff for retries
 */
const rateLimitHandler = {
  /**
   * Execute a function with retry logic for rate limiting
   * @param {Function} fn - The function to execute that returns a Promise
   * @param {Object} options - Options for retry behavior
   * @returns {Promise} - The result of the function
   */
  withRetry: async (fn, options = {}) => {
    const maxRetries = options.maxRetries || config.maxRetries;
    const initialDelay = options.initialDelay || config.retryDelay;
    
    let lastError = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Execute the function
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if error is rate limiting related
        const isRateLimit = error.code === 429 || 
                           (error.errors && error.errors.some(e => e.code === 88 || e.code === 429));
                           
        if (!isRateLimit && !options.retryAllErrors) {
          // If not a rate limit error and we're not retrying all errors, throw immediately
          throw error;
        }
        
        // If this was our last attempt, throw the error
        if (attempt === maxRetries) {
          logger.error(`Maximum retries (${maxRetries}) exceeded:`, error);
          throw error;
        }
        
        // Calculate backoff time with exponential increase
        const delay = initialDelay * Math.pow(2, attempt);
        
        // Log the retry
        if (isRateLimit) {
          logger.warn(`Rate limit hit. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        } else {
          logger.warn(`API error. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries}):`, error);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should not be reached due to the throw in the loop, but just in case
    throw lastError;
  }
};

module.exports = rateLimitHandler;
