/**
 * Configuration for the Kaomoji Twitter Bot
 * 
 * Environment variables are loaded from .env file
 * See .env.example for the required variables
 * 
 * Twitter API credentials are required when MOCK_MODE=false
 * For development without API access, set MOCK_MODE=true
 */
require('dotenv').config();

const mockMode = process.env.MOCK_MODE === 'true';

module.exports = {
  // Operating mode
  // Set MOCK_MODE=true in .env for development without Twitter API
  // Set MOCK_MODE=false in .env for deployment with real Twitter API
  mockMode: mockMode,
  mockDelay: 1000, // Delay in ms for mock operations to simulate API calls
  
  // Twitter API credentials
  // These values are loaded from environment variables defined in .env
  // For real Twitter functionality, you need to:
  // 1. Create a Twitter Developer account
  // 2. Create a Project & App with Elevated access
  // 3. Generate keys and tokens
  // 4. Add them to your .env file (see .env.example)
  twitter: {
    appKey: process.env.API_KEY,         // Consumer Key from Twitter Developer Portal
    appSecret: process.env.API_SECRET_KEY, // Consumer Secret from Twitter Developer Portal
    accessToken: process.env.ACCESS_TOKEN, // Access Token from Twitter Developer Portal
    accessSecret: process.env.ACCESS_TOKEN_SECRET, // Access Token Secret from Twitter Developer Portal
  },
  
  // File paths
  files: {
    kaomojis: './data/kaomojis.json',
    messages: './data/messages.json',
    stats: './data/stats.json', // Stats tracking file
    logs: './logs', // Logs directory
  },
  
  // Scheduling
  postSchedule: mockMode ? '*/2 * * * *' : '0 * * * *', // More frequent in mock mode
  interactionSchedule: '*/2 * * * *', // Check for mentions every 2 minutes
  statsSchedule: '0 0 * * *', // Update stats daily
  
  // Tweet settings
  maxKaomojisPerTweet: 5,
  minKaomojisPerTweet: 1,
  addHashtags: true,
  defaultHashtags: ['#kaomoji', '#kawaii', '#emoji'],
  tweetVarietyRatio: 0.7, // 70% chance for enhanced tweet vs basic kaomoji
  
  // Interaction settings
  respondToMentions: true,
  checkMentionsSince: 15, // Check mentions from the last 15 minutes
  likeReplies: true,
  followBackUsers: true, // Follow users who interact with the bot
  mentionProcessingDelay: 2000, // Delay between processing mentions to avoid rate limits
  maxMentionsPerRun: 10, // Maximum number of mentions to process in a single run
  
  // Content variation
  useTrendingTopics: true, // Include trending topics in tweets
  maxTrendingHashtags: 1, // Maximum number of trending hashtags to include
  
  // Content variation - themes for special days
  useSpecialDayThemes: true, // Post special content on holidays/special days
  
  // Startup behavior
  postOnStartup: true,
  
  // Logging options
  logLevel: process.env.LOG_LEVEL || 'info',
  
  // Rate limiting
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
  
  // Performance
  cacheTimeout: 3600, // Cache expiration in seconds (1 hour)
  
  // Advanced settings
  enableTweetAnalytics: true, // Track tweet performance data
  enableUserEngagementTracking: true, // Track user engagement metrics
  enableCategoryAnalysis: true, // Analyze which kaomoji categories are most popular
  
  // Mock data settings (only used when mockMode is true)
  mockMentionCount: 3, // Number of mock mentions to generate initially
  mockTrendingTopicCount: 5, // Number of mock trending topics to generate
};
