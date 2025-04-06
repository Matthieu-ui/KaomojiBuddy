const twitterClient = require('../twitterClient');
const tweetService = require('./tweetService');
const kaomojiService = require('../kaomoji/kamojiService');
const config = require('../config');
const logger = require('../utils/logger');

// Keywords to identify special command requests from users
const COMMANDS = {
  KAOMOJI: ['kaomoji', 'give me', 'send', 'show'],
  MOOD: ['happy', 'sad', 'love', 'angry', 'surprised', 'sleepy', 'food', 'excited'],
  HELP: ['help', 'how', 'what can you do', 'commands', 'features'],
  STATS: ['stats', 'statistics', 'popular', 'favorite', 'most used']
};

/**
 * Processes new mentions and replies to them
 */
async function handleMentions() {
  if (!config.respondToMentions) {
    return;
  }
  
  try {
    logger.info('Checking for new mentions...');
    
    // Get mentions from the Twitter API
    const mentionsResponse = await twitterClient.getMentions();
    if (!mentionsResponse.data) {
      logger.info('No new mentions found or error retrieving mentions.');
      return;
    }
    
    const mentions = mentionsResponse.data;
    
    if (mentions.length === 0) {
      logger.info('No new mentions found.');
      return;
    }
    
    logger.info(`Found ${mentions.length} new mentions.`);
    
    // Map author IDs to usernames using the includes data
    const userMap = {};
    if (mentionsResponse.includes && mentionsResponse.includes.users) {
      mentionsResponse.includes.users.forEach(user => {
        userMap[user.id] = user;
      });
    }
    
    // Process each mention
    let latestMentionId = null;
    let processedCount = 0;
    
    for (const mention of mentions) {
      // Track the latest mention ID for future calls
      if (!latestMentionId || mention.id > latestMentionId) {
        latestMentionId = mention.id;
      }
      
      // Enhance mention with author data
      if (mention.author_id && userMap[mention.author_id]) {
        mention.author = userMap[mention.author_id];
      } else {
        mention.author = { username: 'user', name: 'Unknown User' };
      }
      
      // Don't process tweets from yourself
      const botUser = await twitterClient.getCurrentUser();
      if (mention.author_id === botUser.id) {
        logger.info(`Skipping mention from self: ${mention.id}`);
        continue;
      }
      
      // Process the mention
      const success = await processMention(mention);
      if (success) processedCount++;
      
      // Add a delay between processing mentions to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, config.mentionProcessingDelay || 2000));
      
      // Limit the number of mentions processed in a single run to avoid overwhelming
      if (processedCount >= config.maxMentionsPerRun) {
        logger.info(`Reached max mentions limit (${config.maxMentionsPerRun}) for this run. Will process more next time.`);
        break;
      }
    }
    
    // Update the last processed mention ID
    if (latestMentionId) {
      await twitterClient.setLastProcessedMentionId(latestMentionId);
      logger.info(`Updated last processed mention ID to: ${latestMentionId}`);
    }
    
  } catch (error) {
    logger.error('Error handling mentions:', error);
  }
}

/**
 * Determine if a mention is asking for a specific category of kaomoji
 */
function detectRequestedCategory(mentionText) {
  const lowerText = mentionText.toLowerCase();
  
  // Check for explicit category requests
  for (const mood of COMMANDS.MOOD) {
    if (lowerText.includes(mood)) {
      return mood;
    }
  }
  
  // Fallback for general category detection
  if (lowerText.includes('cute') || lowerText.includes('adorable')) {
    return 'happy';
  } else if (lowerText.includes('cry') || lowerText.includes('depress')) {
    return 'sad';
  } else if (lowerText.includes('heart') || lowerText.includes('crush') || lowerText.includes('like you')) {
    return 'love';
  } else if (lowerText.includes('mad') || lowerText.includes('upset') || lowerText.includes('hate')) {
    return 'angry';
  } else if (lowerText.includes('shock') || lowerText.includes('woah') || lowerText.includes('wow')) {
    return 'surprised';
  } else if (lowerText.includes('tired') || lowerText.includes('nap') || lowerText.includes('rest')) {
    return 'sleepy';
  } else if (lowerText.includes('eat') || lowerText.includes('hungry') || lowerText.includes('meal')) {
    return 'food';
  }
  
  return null;
}

/**
 * Detect if the user is asking for help or instructions
 */
function isHelpRequest(mentionText) {
  const lowerText = mentionText.toLowerCase();
  const isHelp = COMMANDS.HELP.some(keyword => lowerText.includes(keyword));
  
  // Debug log to help diagnose issues
  if (isHelp) {
    logger.info(`Help request detected: "${mentionText}"`);
  }
  
  return isHelp;
}

/**
 * Detect if the user is asking for stats
 */
function isStatsRequest(mentionText) {
  const lowerText = mentionText.toLowerCase();
  const isStats = COMMANDS.STATS.some(keyword => lowerText.includes(keyword));
  
  // Debug log to help diagnose issues
  if (lowerText.includes('stats')) {
    logger.info(`Stats request detected: "${mentionText}" - Keywords matched: ${isStats}`);
  }
  
  return isStats;
}

/**
 * Generate a help message with instructions
 */
async function generateHelpResponse() {
  const kaomoji = await kaomojiService.getKaomojiByCategory('happy');
  return `Here's how to interact with me ${kaomoji}\n\n`
       + `• Just mention me for a random kaomoji\n`
       + `• Ask for a specific mood (happy, sad, love, etc.)\n`
       + `• Ask for stats to see popular kaomojis\n`
       + `• Coming soon: more interactive features!\n\n`
       + `#KaomojiBot #HowToUse`;
}

/**
 * Process a single mention
 */
async function processMention(mention) {
  try {
    logger.info(`Processing mention from @${mention.author?.username || 'unknown'}: ${mention.text}`);
    
    // Extract the mention text without the username
    const mentionText = mention.text.replace(/@\w+/g, '').trim();
    
    let response;
    
    // Check if it's a help request
    if (isHelpRequest(mentionText)) {
      const helpText = await generateHelpResponse();
      response = await twitterClient.reply(`@${mention.author.username} ${helpText}`, mention.id);
      logger.info(`Sent help information to @${mention.author.username}`);
    } 
    // Check if it's a stats request
    else if (isStatsRequest(mentionText)) {
      const popularKaomojis = await kaomojiService.getPopularKaomojis(twitterClient, 3);
      const statsText = popularKaomojis.length > 0 
        ? `Here are the most popular kaomojis: ${popularKaomojis.join(' ')} #KaomojiStats`
        : `I don't have enough data yet to show popular kaomojis (＃´ー´)ﾉ But keep interacting!`;
      
      response = await twitterClient.reply(`@${mention.author.username} ${statsText}`, mention.id);
      logger.info(`Sent stats to @${mention.author.username}`);
    }
    // Regular kaomoji response
    else {
      // Check if user is asking for a specific mood/category
      const requestedCategory = detectRequestedCategory(mentionText);
      
      // Send the response using the tweet service
      mention.requestedCategory = requestedCategory; // Add the detected category to the mention object
      response = await tweetService.respondToMention(mention);
    }
    
    // Optionally like the mention (moved to tweetService for regular responses)
    if (config.likeReplies && response && 
        !isHelpRequest(mentionText) && !isStatsRequest(mentionText)) {
      await twitterClient.likeTweet(mention.id);
      logger.info(`Liked mention: ${mention.id}`);
    }
    
    // Update interaction metrics
    await updateInteractionMetrics(mention.author.username);
    
    return true;
  } catch (error) {
    logger.error(`Failed to process mention ${mention.id}:`, error);
    return false;
  }
}

/**
 * Track user interactions for metrics
 */
async function updateInteractionMetrics(username) {
  try {
    const stats = await twitterClient.loadStats();
    
    if (!stats.userInteractions) {
      stats.userInteractions = {};
    }
    
    if (!stats.userInteractions[username]) {
      stats.userInteractions[username] = 1;
    } else {
      stats.userInteractions[username]++;
    }
    
    // Track total interactions
    stats.totalInteractions = (stats.totalInteractions || 0) + 1;
    
    await twitterClient.saveStats(stats);
  } catch (error) {
    logger.error('Error updating interaction metrics:', error);
  }
}

/**
 * Gets the most active users from stats
 */
async function getActiveUsers(count = 5) {
  try {
    const stats = await twitterClient.loadStats();
    
    if (!stats.userInteractions) {
      return [];
    }
    
    // Convert to array of [username, count] pairs and sort by count
    const interactionsArray = Object.entries(stats.userInteractions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);
    
    return interactionsArray;
  } catch (error) {
    logger.error('Error getting active users:', error);
    return [];
  }
}

/**
 * Post a thank you message to most active users
 */
async function postActiveUsersThanks() {
  try {
    const activeUsers = await getActiveUsers(3);
    
    if (activeUsers.length === 0) {
      logger.info('No active users to thank yet.');
      return null;
    }
    
    const kaomoji = await kaomojiService.getKaomojiByCategory('love');
    const userMentions = activeUsers.map(([username]) => `@${username}`).join(' ');
    
    const thankYouTweet = `Special thanks to our most active followers: ${userMentions} ${kaomoji} Your interactions make this bot better! #ThankYou #Kaomoji`;
    
    const response = await twitterClient.tweet(thankYouTweet);
    logger.info(`Posted thank you tweet to active users`);
    return response;
  } catch (error) {
    logger.error('Error posting active users thanks:', error);
    return null;
  }
}

module.exports = {
  handleMentions,
  postActiveUsersThanks,
  getActiveUsers
};
