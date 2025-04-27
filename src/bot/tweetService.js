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
 * Creates a tweet that includes trending topics with enhanced contextual relevance
 * This improved function matches trending topics to appropriate kaomoji categories
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
    
    // Extract trend keywords (without the hashtag symbol)
    const trendKeywords = trendingHashtags.map(tag => tag.replace('#', '').toLowerCase());
    
    // Attempt to match trend keywords to appropriate kaomoji categories
    let category = null;
    
    // Sentiment analysis keywords for matching trends to kaomoji categories
    const sentimentKeywords = {
      happy: ['happy', 'joy', 'fun', 'smile', 'great', 'good', 'amazing', 'awesome', 'best', 'love', 'cute'],
      sad: ['sad', 'sorry', 'bad', 'miss', 'lost', 'crying', 'tears', 'alone', 'hurt', 'broken'],
      surprised: ['wow', 'omg', 'shocked', 'surprise', 'unbelievable', 'incredible', 'amazing', 'wtf', 'unexpected'],
      worried: ['worried', 'anxiety', 'concern', 'nervous', 'scary', 'scared', 'fear', 'panic', 'stress', 'tension'],
      love: ['love', 'heart', 'romance', 'date', 'couple', 'wedding', 'marry', 'relationship', 'valentine'],
      angry: ['angry', 'mad', 'fury', 'hate', 'rage', 'terrible', 'worst', 'unfair', 'upset', 'annoyed'],
      sleepy: ['sleep', 'tired', 'nap', 'bed', 'rest', 'night', 'dream', 'snooze', 'relax', 'peaceful', 'calm'],
      food: ['food', 'eat', 'hungry', 'meal', 'breakfast', 'lunch', 'dinner', 'snack', 'yummy', 'delicious', 'tasty', 'restaurant', 'cook', 'bake']
    };
    
    // Try to match trending topics to a kaomoji category
    for (const keyword of trendKeywords) {
      for (const [cat, keywordList] of Object.entries(sentimentKeywords)) {
        if (keywordList.some(k => keyword.includes(k))) {
          category = cat;
          break;
        }
      }
      if (category) break;
    }
    
    // If no match found, choose a random category or default to happy
    if (!category) {
      // Current time and context might influence the category
      const hour = new Date().getHours();
      const dayType = kaomojiService.getDayOfWeekType();
      
      if (hour < 7 || hour > 22) {
        // Early morning or late night - sleepy
        category = Math.random() > 0.5 ? 'sleepy' : 'surprised';
      } else if (hour >= 11 && hour <= 14) {
        // Lunch time - food
        category = Math.random() > 0.6 ? 'food' : 'happy';
      } else if (dayType === 'friday') {
        // Friday vibes - always happy
        category = 'happy';
      } else if (dayType === 'monday') {
        // Monday blues - slight chance of worried
        category = Math.random() > 0.7 ? 'worried' : 'happy';
      } else {
        // Default - happy most of the time
        category = Math.random() > 0.3 ? 'happy' : await kaomojiService.getRandomCategory();
      }
    }
    
    // Get a kaomoji matching the selected or detected category
    const kaomoji = await kaomojiService.getKaomojiByCategory(category);
    
    // Get a message template that fits the trending context
    // Choose from moods or times based on content
    const messageType = Math.random() > 0.5 ? 'moods' : 'times';
    const messageTemplate = await kaomojiService.getRandomMessage(messageType);
    
    // Track usage for stats
    await kaomojiService.trackKaomojiUsage(kaomoji, twitterClient);
    await kaomojiService.trackCategoryUsage(category, twitterClient);
    
    // Replace placeholder with kaomoji
    let tweetContent = messageTemplate.replace('{kaomoji}', kaomoji);
    
    // Add trending reference to the tweet content occasionally
    if (trendKeywords.length > 0 && Math.random() > 0.5) {
      const randomTrend = trendKeywords[Math.floor(Math.random() * trendKeywords.length)];
      
      // Only add if not already in the message
      if (!tweetContent.toLowerCase().includes(randomTrend)) {
        if (Math.random() > 0.5) {
          tweetContent += ` | Trending: ${randomTrend}`;
        } else {
          tweetContent = `${randomTrend} mood: ${tweetContent}`;
        }
      }
    }
    
    // Add trending hashtags and random hashtags
    const randomHashtags = await kaomojiService.getRandomHashtags(1);
    const hashtags = [...randomHashtags, ...trendingHashtags];
    tweetContent += ' ' + hashtags.join(' ');
    
    logger.info(`Created trending tweet (${category}) with hashtags: ${trendingHashtags.join(', ')}`);
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
 * Posts a random kaomoji tweet with enhanced content variety
 * Weighted selection algorithm with time and trending influences
 */
async function postRandomContent() {
  try {
    // Get current hour to influence tweet type selection
    const currentHour = new Date().getHours();
    const isBusinessHours = currentHour >= 9 && currentHour <= 17;
    const isEvening = currentHour >= 18 && currentHour <= 23;
    const isLateNight = currentHour >= 0 && currentHour <= 4;
    
    // Dynamic weighted selection based on time of day
    let tweetTypeRandom = Math.random();
    let contentType = '';
    let tweetContent;
    
    // Check for trending topics availability to influence decision
    const trendingData = config.useTrendingTopics ? 
                         await twitterClient.getTrendingTopics() : null;
    const hasTrendingTopics = trendingData && 
                             trendingData.data && 
                             trendingData.data.length > 0;
    
    // Time-based selection weights
    if (isBusinessHours) {
      // During business hours: more trending and contextual content
      if (tweetTypeRandom < 0.15) {
        // 15% chance for simple kaomoji tweet 
        contentType = 'simple';
        tweetContent = await createSimpleKaomojiTweet();
      } 
      else if (tweetTypeRandom < 0.40 && hasTrendingTopics) {
        // 25% chance for trending tweet if topics available
        contentType = 'trending';
        tweetContent = await createTrendingTweet();
      }
      else if (tweetTypeRandom < 0.45) {
        // 5% chance for popular kaomoji showcase
        contentType = 'popular';
        tweetContent = await createPopularKaomojiTweet();
      } 
      else {
        // 55% chance for contextual tweet (time/season aware)
        contentType = 'contextual';
        tweetContent = await createContextualTweet();
      }
    } 
    else if (isEvening) {
      // Evening hours: more casual, contextual content
      if (tweetTypeRandom < 0.10) {
        // 10% chance for simple kaomoji tweet
        contentType = 'simple';
        tweetContent = await createSimpleKaomojiTweet();
      } 
      else if (tweetTypeRandom < 0.25 && hasTrendingTopics) {
        // 15% chance for trending tweet if topics available
        contentType = 'trending';
        tweetContent = await createTrendingTweet();
      }
      else if (tweetTypeRandom < 0.35) {
        // 10% chance for popular kaomoji showcase
        contentType = 'popular';
        tweetContent = await createPopularKaomojiTweet();
      } 
      else {
        // 65% chance for contextual tweet (more in evening)
        contentType = 'contextual';
        tweetContent = await createContextualTweet();
      }
    }
    else if (isLateNight) {
      // Late night: more simple content, less trending
      if (tweetTypeRandom < 0.30) {
        // 30% chance for simple kaomoji tweet
        contentType = 'simple';
        tweetContent = await createSimpleKaomojiTweet();
      } 
      else if (tweetTypeRandom < 0.35 && hasTrendingTopics) {
        // Only 5% chance for trending tweet late at night
        contentType = 'trending';
        tweetContent = await createTrendingTweet();
      }
      else if (tweetTypeRandom < 0.40) {
        // 5% chance for popular kaomoji showcase
        contentType = 'popular';
        tweetContent = await createPopularKaomojiTweet();
      } 
      else {
        // 60% chance for contextual tweet
        contentType = 'contextual';
        tweetContent = await createContextualTweet();
      }
    }
    else {
      // Morning hours: balanced mix
      if (tweetTypeRandom < 0.20) {
        // 20% chance for simple kaomoji tweet
        contentType = 'simple';
        tweetContent = await createSimpleKaomojiTweet();
      } 
      else if (tweetTypeRandom < 0.35 && hasTrendingTopics) {
        // 15% chance for trending tweet if available
        contentType = 'trending';
        tweetContent = await createTrendingTweet();
      }
      else if (tweetTypeRandom < 0.40) {
        // 5% chance for popular kaomoji showcase
        contentType = 'popular';
        tweetContent = await createPopularKaomojiTweet();
      } 
      else {
        // 60% chance for contextual tweet
        contentType = 'contextual';
        tweetContent = await createContextualTweet();
      }
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
      
      // Track content type distribution
      if (!stats.contentTypes) {
        stats.contentTypes = {};
      }
      stats.contentTypes[contentType] = (stats.contentTypes[contentType] || 0) + 1;
      
      stats.lastUpdated = new Date().toISOString();
      await twitterClient.saveStats(stats);
    } catch (error) {
      logger.error('Error updating tweet stats:', error);
    }
    
    logger.info(`Tweet sent successfully (${contentType} type): ${tweetContent}`);
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
 * Posts daily stats of most popular kaomojis and content distribution
 * Enhanced with rich stats including content type tracking
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
    
    // Get current season and time info for contextual stats message
    const season = kaomojiService.getCurrentSeason();
    const timeOfDay = kaomojiService.getTimeBasedType().replace('_', ' ');
    
    // Get most popular content type if available
    let popularContentType = '';
    if (stats.contentTypes) {
      const contentTypesArray = Object.entries(stats.contentTypes)
        .sort((a, b) => b[1] - a[1]);
      
      if (contentTypesArray.length > 0) {
        popularContentType = contentTypesArray[0][0];
      }
    }
    
    let statsTweet = `Bot stats update: Posted ${totalTweets} tweets and replied to ${totalReplies} mentions!`;
    
    // Add popular kaomojis
    statsTweet += ` Most popular kaomojis: ${popularKaomojis.join(' ')}`;
    
    // Add content type info if available
    if (popularContentType) {
      statsTweet += ` Most common tweet type: ${popularContentType}`;
    }
    
    // Add seasonal hashtag
    const seasonHashtag = `#${season.charAt(0).toUpperCase() + season.slice(1)}Kaomojis`;
    statsTweet += ` #KaomojiStats ${seasonHashtag}`;
    
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
