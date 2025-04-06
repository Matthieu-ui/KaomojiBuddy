const twitterClient = require('../twitterClient');
const kaomojiService = require('../kaomoji/kamojiService');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Creates a simple tweet with just random kaomojis
 */
async function createSimpleKaomojiTweet() {
  const count = Math.floor(Math.random() * 
    (config.maxKaomojisPerTweet - config.minKaomojisPerTweet + 1)) + 
    config.minKaomojisPerTweet;
  
  const kaomojis = await kaomojiService.getRandomKaomojis(count);
  
  // Track kaomoji usage for stats
  for (const kaomoji of kaomojis) {
    await kaomojiService.trackKaomojiUsage(kaomoji, twitterClient);
  }
  
  return kaomojis.join(' ');
}

/**
 * Creates a tweet that includes trending topics
 */
async function createTrendingTweet() {
  try {
    // Get trending topics
    const trendingData = await twitterClient.getTrendingTopics();
    const trendingHashtags = await kaomojiService.getTrendingHashtags(
      trendingData, 
      config.maxTrendingHashtags
    );
    
    if (!trendingHashtags || trendingHashtags.length === 0) {
      // Fall back to regular enhanced tweet if no trending hashtags
      return createEnhancedTweet();
    }
    
    // Get random message and kaomoji
    const messageTemplate = await kaomojiService.getRandomMessage('moods');
    const category = await kaomojiService.getRandomCategory();
    const kaomoji = await kaomojiService.getKaomojiByCategory(category);
    
    // Track usage
    await kaomojiService.trackKaomojiUsage(kaomoji, twitterClient);
    await kaomojiService.trackCategoryUsage(category, twitterClient);
    
    // Replace placeholder with kaomoji
    let tweetContent = messageTemplate.replace('{kaomoji}', kaomoji);
    
    // Add trending hashtags and random hashtags
    const randomHashtags = await kaomojiService.getRandomHashtags(1);
    const hashtags = [...randomHashtags, ...trendingHashtags];
    tweetContent += ' ' + hashtags.join(' ');
    
    logger.info(`Created trending tweet with hashtags: ${trendingHashtags.join(', ')}`);
    return tweetContent;
  } catch (error) {
    logger.error('Error creating trending tweet:', error);
    // Fall back to regular tweet on error
    return createEnhancedTweet();
  }
}

/**
 * Creates a contextually aware tweet based on time of day, day of week, etc.
 */
async function createContextualTweet() {
  try {
    const content = await kaomojiService.createContextualTweet(twitterClient);
    
    // Construct tweet content
    let tweetContent = content.message;
    
    // Add hashtags if not already part of special day content
    if (config.addHashtags && !content.hashtags) {
      const hashtags = await kaomojiService.getRandomHashtags(2);
      tweetContent += ' ' + hashtags.join(' ');
    } else if (content.hashtags && content.hashtags.length > 0) {
      tweetContent += ' ' + content.hashtags.join(' ');
    }
    
    logger.info(`Created contextual tweet: ${tweetContent}`);
    return tweetContent;
  } catch (error) {
    logger.error('Error creating contextual tweet:', error);
    // Fall back to legacy enhanced tweet on error
    return createEnhancedTweet();
  }
}

/**
 * Creates a more complex tweet with text, kaomoji, and hashtags (legacy method)
 */
async function createEnhancedTweet() {
  // Determine the current context
  const now = new Date();
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
  const hour = now.getHours();
  
  // Choose context-appropriate message type
  let messageType;
  if (hour >= 5 && hour < 10) {
    messageType = 'greetings'; // Morning
  } else if (hour >= 21 || hour < 5) {
    messageType = 'moods'; // Night
  } else {
    // Use day of week during the day
    messageType = 'weekdays';
  }
  
  // Get message template and kaomoji
  const messageTemplate = await kaomojiService.getRandomMessage(messageType);
  const category = 'happy'; // Default to happy for legacy method
  const kaomoji = await kaomojiService.getKaomojiByCategory(category);
  
  // Track usage
  await kaomojiService.trackKaomojiUsage(kaomoji, twitterClient);
  await kaomojiService.trackCategoryUsage(category, twitterClient);
  
  // Replace placeholder with kaomoji
  let tweetContent = messageTemplate.replace('{kaomoji}', kaomoji);
  
  // Add hashtags
  if (config.addHashtags) {
    const hashtags = await kaomojiService.getRandomHashtags(2);
    tweetContent += ' ' + hashtags.join(' ');
  }
  
  return tweetContent;
}

/**
 * Creates a special tweet that showcases popular kaomojis
 */
async function createPopularKaomojiTweet() {
  try {
    // Get popular kaomojis
    const popularKaomojis = await kaomojiService.getPopularKaomojis(twitterClient, 3);
    
    if (!popularKaomojis || popularKaomojis.length === 0) {
      return createEnhancedTweet(); // Fallback
    }
    
    const tweetContent = `Your favorite kaomojis so far: ${popularKaomojis.join(' ')} #kaomoji #FanFavorites`;
    
    return tweetContent;
  } catch (error) {
    logger.error('Error creating popular kaomoji tweet:', error);
    return createEnhancedTweet(); // Fallback
  }
}

/**
 * Posts a random kaomoji tweet
 */
async function postRandomContent() {
  try {
    // Choose tweet type based on variety preferences
    const tweetTypeRandom = Math.random();
    let tweetContent;
    
    if (tweetTypeRandom < 0.2) {
      // 20% chance for simple kaomoji tweet
      tweetContent = await createSimpleKaomojiTweet();
    } else if (tweetTypeRandom < 0.4 && config.useTrendingTopics) {
      // 20% chance for trending tweet if enabled
      tweetContent = await createTrendingTweet();
    } else if (tweetTypeRandom < 0.45) {
      // 5% chance for popular kaomoji showcase
      tweetContent = await createPopularKaomojiTweet();
    } else {
      // 55% chance for contextual tweet
      tweetContent = await createContextualTweet();
    }
    
    // Post the tweet
    const response = await twitterClient.tweet(tweetContent);
    
    // Update stats
    try {
      const stats = await twitterClient.loadStats();
      stats.totalTweets = (stats.totalTweets || 0) + 1;
      
      // Track daily tweets
      const today = new Date().toISOString().split('T')[0];
      if (!stats.dailyTweets) {
        stats.dailyTweets = {};
      }
      stats.dailyTweets[today] = (stats.dailyTweets[today] || 0) + 1;
      
      stats.lastUpdated = new Date().toISOString();
      await twitterClient.saveStats(stats);
    } catch (error) {
      logger.error('Error updating tweet stats:', error);
    }
    
    logger.info(`Tweet sent successfully: ${tweetContent}`);
    return response;
  } catch (error) {
    logger.error('Error posting tweet:', error);
    throw error;
  }
}

/**
 * Posts a startup message when the bot initializes
 */
async function postStartupMessage() {
  try {
    // Special kaomoji for startup
    const kaomoji = await kaomojiService.getKaomojiByCategory('happy');
    const tweetContent = `Kaomoji bot is now online! ${kaomoji} #kaomoji`;
    
    const response = await twitterClient.tweet(tweetContent);
    logger.info(`Startup tweet sent: ${tweetContent}`);
    return response;
  } catch (error) {
    logger.error('Error posting startup tweet:', error);
    // Don't throw error for startup tweet - the bot should continue running
    return null;
  }
}

/**
 * Responds to a mention with a kaomoji
 */
async function respondToMention(mention) {
  try {
    // Extract the mention text without the username
    const mentionText = mention.text.replace(/@\w+/g, '').trim();
    
    // Get a context-aware response template
    const responseTemplate = await kaomojiService.getResponseMessage(mentionText);
    
    // If interactionService has already detected a category, use that
    let category = mention.requestedCategory || 'happy'; // Default to happy if no category detected
    
    // Only analyze content if no category has been detected yet
    if (!mention.requestedCategory) {
      const lowerText = mentionText.toLowerCase();
      
      if (lowerText.includes('sad') || lowerText.includes('unhappy') || lowerText.includes('depressed')) {
        category = 'sad';
      } else if (lowerText.includes('happy') || lowerText.includes('joy') || lowerText.includes('glad')) {
        category = 'happy';
      } else if (lowerText.includes('food') || lowerText.includes('hungry') || lowerText.includes('eat')) {
        category = 'food';
      } else if (lowerText.includes('love') || lowerText.includes('heart') || lowerText.includes('cute')) {
        category = 'love';
      } else if (lowerText.includes('surprise') || lowerText.includes('shock') || lowerText.includes('wow')) {
        category = 'surprised';
      } else if (lowerText.includes('angry') || lowerText.includes('mad') || lowerText.includes('upset')) {
        category = 'angry';
      } else if (lowerText.includes('sleep') || lowerText.includes('tired') || lowerText.includes('nap')) {
        category = 'sleepy';
      }
    }
    
    // Get appropriate kaomoji
    const kaomoji = await kaomojiService.getKaomojiByCategory(category);
    
    // Track usage
    await kaomojiService.trackKaomojiUsage(kaomoji, twitterClient);
    await kaomojiService.trackCategoryUsage(category, twitterClient);
    
    // Create reply text with mentioned username
    let replyText = `@${mention.author.username} `;
    replyText += responseTemplate.replace('{kaomoji}', kaomoji);
    
    // Post the reply
    const response = await twitterClient.reply(replyText, mention.id);
    
    // Like the mention if configured
    if (config.likeReplies) {
      await twitterClient.likeTweet(mention.id);
    }
    
    // Follow the user if configured
    if (config.followBackUsers) {
      await twitterClient.followUser(mention.author.id);
    }
    
    // Update stats
    try {
      const stats = await twitterClient.loadStats();
      stats.totalReplies = (stats.totalReplies || 0) + 1;
      stats.lastUpdated = new Date().toISOString();
      await twitterClient.saveStats(stats);
    } catch (error) {
      logger.error('Error updating reply stats:', error);
    }
    
    logger.info(`Replied to mention from @${mention.author.username}: ${replyText}`);
    return response;
  } catch (error) {
    logger.error(`Error replying to mention ${mention.id}:`, error);
    return null;
  }
}

/**
 * Posts daily stats of most popular kaomojis
 */
async function postStats() {
  try {
    const stats = await twitterClient.loadStats();
    const popularKaomojis = await kaomojiService.getPopularKaomojis(twitterClient, 3);
    
    if (!stats || !popularKaomojis || popularKaomojis.length === 0) {
      logger.info('Not enough stats to post a summary');
      return null;
    }
    
    const totalTweets = stats.totalTweets || 0;
    const totalReplies = stats.totalReplies || 0;
    
    const statsTweet = `Bot stats update: Posted ${totalTweets} tweets and replied to ${totalReplies} mentions! Most popular kaomojis: ${popularKaomojis.join(' ')} #KaomojiStats`;
    
    const response = await twitterClient.tweet(statsTweet);
    logger.info(`Stats tweet posted: ${statsTweet}`);
    return response;
  } catch (error) {
    logger.error('Error posting stats tweet:', error);
    return null;
  }
}

module.exports = {
  postRandomContent,
  postStartupMessage,
  respondToMention,
  postStats,
  createSimpleKaomojiTweet,
  createEnhancedTweet,
  createContextualTweet,
  createTrendingTweet,
  createPopularKaomojiTweet
};
