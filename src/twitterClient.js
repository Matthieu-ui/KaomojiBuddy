const { TwitterApi } = require('twitter-api-v2');
const config = require('./config');
const logger = require('./utils/logger');
const rateLimitHandler = require('./utils/rateLimitHandler');
const fs = require('fs').promises;
const path = require('path');

// Create a mock delay function
const mockDelay = async () => {
  return new Promise(resolve => setTimeout(resolve, config.mockDelay));
};

// Mock ID generator
let mockIdCounter = 1000;
const generateMockId = () => {
  return (mockIdCounter++).toString();
};

// Create Twitter client or mock client based on configuration
let client, rwClient;

// Create a stats directory if it doesn't exist
const createStatsDir = async () => {
  try {
    const statsDir = path.dirname(config.files.stats);
    await fs.mkdir(statsDir, { recursive: true });
  } catch (error) {
    logger.error('Error creating stats directory:', error);
  }
};

// Initialize the mock data
const mockData = {
  currentUser: {
    id: '12345678',
    username: 'kaomoji_bot_mock',
    name: 'Kaomoji Bot (Mock)',
    profile_image_url: 'https://example.com/profile.jpg'
  },
  tweets: [],
  mentions: [
    {
      id: '987654321',
      text: '@kaomoji_bot_mock Hi! Can you share a happy kaomoji?',
      author_id: '11111111',
      created_at: new Date().toISOString(),
      conversation_id: '987654321',
      referenced_tweets: []
    },
    {
      id: '987654322',
      text: '@kaomoji_bot_mock I\'m feeling sad today...',
      author_id: '22222222',
      created_at: new Date().toISOString(),
      conversation_id: '987654322',
      referenced_tweets: []
    }
  ],
  users: [
    {
      id: '11111111',
      username: 'user1',
      name: 'Mock User 1'
    },
    {
      id: '22222222',
      username: 'user2',
      name: 'Mock User 2'
    }
  ],
  likes: [],
  followers: [],
  lastProcessedMentionId: null
};

/**
 * Initialize real Twitter client if not in mock mode
 * 
 * To use a real Twitter account, you need to:
 * 1. Set MOCK_MODE=false in .env file
 * 2. Add your Twitter API credentials in .env file:
 *    - API_KEY: Your Twitter API Key (Consumer Key)
 *    - API_SECRET_KEY: Your Twitter API Secret Key (Consumer Secret)
 *    - ACCESS_TOKEN: Your Twitter Access Token
 *    - ACCESS_TOKEN_SECRET: Your Twitter Access Token Secret
 * 
 * Get these credentials from the Twitter Developer Portal:
 * https://developer.twitter.com/en/portal/dashboard
 */
if (!config.mockMode) {
  try {
    client = new TwitterApi({
      appKey: config.twitter.appKey,
      appSecret: config.twitter.appSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessSecret,
    });
    rwClient = client.readWrite;
    logger.info('Twitter client initialized with real API credentials');
  } catch (error) {
    logger.error('Error initializing Twitter client:', error);
    logger.error('Please check your Twitter API credentials in .env file');
    process.exit(1);
  }
}

// Create mock or real client with rate limit handling
const twitterClient = {
  // Tweet methods
  tweet: async (content) => {
    if (config.mockMode) {
      await mockDelay();
      logger.info('[MOCK] Tweeted:', content);
      const mockTweet = {
        id: generateMockId(),
        text: content,
        created_at: new Date().toISOString()
      };
      mockData.tweets.push(mockTweet);
      return { data: mockTweet };
    } else {
      return rateLimitHandler.withRetry(() => rwClient.v2.tweet(content));
    }
  },
  
  // Reply to a tweet
  reply: async (text, replyToTweetId) => {
    if (config.mockMode) {
      await mockDelay();
      logger.info(`[MOCK] Replied to tweet ${replyToTweetId}:`, text);
      const mockReply = {
        id: generateMockId(),
        text: text,
        created_at: new Date().toISOString(),
        referenced_tweets: [{ type: 'replied_to', id: replyToTweetId }]
      };
      mockData.tweets.push(mockReply);
      return { data: mockReply };
    } else {
      return rateLimitHandler.withRetry(() => 
        rwClient.v2.reply(text, replyToTweetId)
      );
    }
  },
  
  // Get recent mentions
  getMentions: async (sinceMinutes = config.checkMentionsSince) => {
    try {
      if (config.mockMode) {
        await mockDelay();
        const sinceTime = new Date(Date.now() - (sinceMinutes * 60 * 1000));
        const sinceId = await twitterClient.getLastProcessedMentionId();
        
        // Filter mentions based on time or ID
        const filteredMentions = mockData.mentions.filter(mention => {
          if (sinceId) {
            return mention.id > sinceId;
          } else {
            return new Date(mention.created_at) > sinceTime;
          }
        });
        
        logger.info(`[MOCK] Found ${filteredMentions.length} mentions`);
        return { 
          data: filteredMentions,
          includes: {
            users: mockData.users
          }
        };
      } else {
        // Calculate the since time
        const sinceTime = new Date(Date.now() - (sinceMinutes * 60 * 1000));
        const sinceId = await twitterClient.getLastProcessedMentionId();
        
        const mentionParams = { 
          max_results: 100,
          expansions: ['author_id', 'referenced_tweets.id'],
          'tweet.fields': ['created_at', 'text', 'conversation_id'],
          'user.fields': ['username'],
        };
        
        if (sinceId) {
          mentionParams.since_id = sinceId;
        }
        
        // First get the current user if not already cached
        if (!client.currentUser) {
          await twitterClient.getCurrentUser();
        }
        
        // twitter-api-v2 uses userMentionTimeline for v2 API
        return rateLimitHandler.withRetry(() => 
          rwClient.v2.userMentionTimeline(client.currentUser.id, mentionParams)
        );
      }
    } catch (error) {
      logger.error('Error getting mentions:', error);
      return { data: [] };
    }
  },
  
  // Like a tweet
  likeTweet: async (tweetId) => {
    try {
      if (config.mockMode) {
        await mockDelay();
        mockData.likes.push({
          tweet_id: tweetId,
          user_id: mockData.currentUser.id,
          created_at: new Date().toISOString()
        });
        logger.info(`[MOCK] Liked tweet: ${tweetId}`);
        return { data: { liked: true } };
      } else {
        return rateLimitHandler.withRetry(() => 
          rwClient.v2.like(client.currentUser.id, tweetId)
        );
      }
    } catch (error) {
      logger.error(`Error liking tweet ${tweetId}:`, error);
      return { data: { liked: false } };
    }
  },
  
  // Follow a user
  followUser: async (userId) => {
    try {
      if (config.mockMode) {
        await mockDelay();
        mockData.followers.push({
          follower_id: mockData.currentUser.id,
          following_id: userId,
          created_at: new Date().toISOString()
        });
        logger.info(`[MOCK] Followed user: ${userId}`);
        return { data: { following: true } };
      } else {
        return rateLimitHandler.withRetry(() => 
          rwClient.v2.follow(client.currentUser.id, userId)
        );
      }
    } catch (error) {
      logger.error(`Error following user ${userId}:`, error);
      return { data: { following: false } };
    }
  },
  
  // Get trending topics
  getTrendingTopics: async (woeid = 1) => { // Default to worldwide (1)
    try {
      if (config.mockMode) {
        await mockDelay();
        const mockTrends = [
          { name: '#Kaomoji', tweet_volume: 5000 },
          { name: '#Anime', tweet_volume: 25000 },
          { name: '#Kawaii', tweet_volume: 1500 },
          { name: '#Japan', tweet_volume: 40000 },
          { name: '#WednesdayWisdom', tweet_volume: 10000 }
        ];
        logger.info('[MOCK] Fetched trending topics');
        return { data: mockTrends };
      } else {
        // V2 endpoint for trends
        return rateLimitHandler.withRetry(() => 
          rwClient.v1.trendsByPlace(woeid)
        );
      }
    } catch (error) {
      logger.error('Error getting trending topics:', error);
      return { data: [] };
    }
  },
  
  // Store and retrieve the last processed mention ID
  setLastProcessedMentionId: async (id) => {
    if (config.mockMode) {
      mockData.lastProcessedMentionId = id;
    } else {
      twitterClient._lastProcessedMentionId = id;
    }
    return id;
  },
  
  getLastProcessedMentionId: async () => {
    return config.mockMode ? mockData.lastProcessedMentionId : twitterClient._lastProcessedMentionId;
  },
  
  // Get current user details
  getCurrentUser: async () => {
    if (config.mockMode) {
      await mockDelay();
      logger.info(`[MOCK] Bot user: @${mockData.currentUser.username} (${mockData.currentUser.id})`);
      return mockData.currentUser;
    } else {
      if (!client.currentUser) {
        try {
          const userResponse = await rateLimitHandler.withRetry(() => 
            rwClient.v2.me({ 
              'user.fields': ['username', 'id', 'name', 'profile_image_url'] 
            })
          );
          client.currentUser = userResponse.data;
          logger.info(`Bot user: @${client.currentUser.username} (${client.currentUser.id})`);
        } catch (error) {
          logger.error('Failed to get current user info:', error);
          client.currentUser = {
            id: 'unknown',
            username: 'unknown',
            name: 'Unknown Bot',
            profile_image_url: ''
          };
        }
      }
      return client.currentUser;
    }
  },
  
  // Save stats
  saveStats: async (stats) => {
    try {
      await createStatsDir();
      await fs.writeFile(config.files.stats, JSON.stringify(stats, null, 2));
      logger.info('Bot stats saved successfully');
      return true;
    } catch (error) {
      logger.error('Error saving bot stats:', error);
      return false;
    }
  },
  
  // Load stats
  loadStats: async () => {
    try {
      const data = await fs.readFile(config.files.stats, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.info('No previous stats found, creating new stats');
      const initialStats = {
        totalTweets: 0,
        totalReplies: 0,
        totalLikes: 0,
        categoryStats: {},
        popularKaomojis: {},
        dailyTweets: {},
        lastUpdated: new Date().toISOString()
      };
      await twitterClient.saveStats(initialStats);
      return initialStats;
    }
  },
  
  // Mock-only methods for testing
  _mockData: mockData,
  
  addMockMention: async (mention) => {
    if (config.mockMode) {
      mockData.mentions.push({
        id: generateMockId(),
        text: mention.text,
        author_id: mention.author_id || '33333333',
        created_at: new Date().toISOString(),
        conversation_id: generateMockId(),
        referenced_tweets: []
      });
      
      // Add user if not exists
      if (!mockData.users.find(u => u.id === mention.author_id)) {
        mockData.users.push({
          id: mention.author_id || '33333333',
          username: mention.username || 'test_user',
          name: mention.name || 'Test User'
        });
      }
      
      return true;
    }
    return false;
  }
};

// Initialize client info
const initializeClient = async () => {
  try {
    await twitterClient.getCurrentUser();
    await createStatsDir();
    logger.info(`Twitter client initialized in ${config.mockMode ? 'MOCK' : 'LIVE'} mode`);
  } catch (error) {
    if (!config.mockMode) {
      logger.error('Failed to initialize Twitter client:', error);
      process.exit(1);
    } else {
      logger.warn('Failed to initialize real Twitter client but continuing in mock mode');
    }
  }
};

// Initialize
initializeClient();

module.exports = twitterClient;
