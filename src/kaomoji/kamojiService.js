const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

// Cached kaomojis and messages
let kaomojiCache = null;
let messagesCache = null;
let lastCacheTime = null;

// Special days (month/day format)
const specialDays = {
  '01/01': { name: 'New Year', template: 'Happy New Year! {kaomoji}', category: 'happy', hashtags: ['#NewYear', '#HappyNewYear'] },
  '02/14': { name: 'Valentine\'s Day', template: 'Happy Valentine\'s Day! {kaomoji}', category: 'love', hashtags: ['#ValentinesDay', '#Love'] },
  '03/17': { name: 'St. Patrick\'s Day', template: 'Happy St. Patrick\'s Day! {kaomoji}', category: 'happy', hashtags: ['#StPatricksDay', '#Lucky'] },
  '04/01': { name: 'April Fools', template: 'Happy April Fools\' Day! {kaomoji}', category: 'surprised', hashtags: ['#AprilFools', '#Pranks'] },
  '10/31': { name: 'Halloween', template: 'Happy Halloween! {kaomoji}', category: 'surprised', hashtags: ['#Halloween', '#Spooky'] },
  '12/25': { name: 'Christmas', template: 'Merry Christmas! {kaomoji}', category: 'happy', hashtags: ['#MerryChristmas', '#Christmas'] },
  '12/31': { name: 'New Year\'s Eve', template: 'Happy New Year\'s Eve! {kaomoji}', category: 'happy', hashtags: ['#NewYearsEve', '#Countdown'] }
};

/**
 * Check if the cache needs to be refreshed
 */
function isCacheExpired() {
  if (!lastCacheTime) return true;
  
  const now = Date.now();
  const cacheAgeMs = now - lastCacheTime;
  return cacheAgeMs > (config.cacheTimeout * 1000);
}

/**
 * Loads kaomojis from the JSON file
 */
async function loadKaomojis() {
  if (kaomojiCache && !isCacheExpired()) {
    return kaomojiCache;
  }
  
  try {
    const data = await fs.readFile(config.files.kaomojis, 'utf8');
    kaomojiCache = JSON.parse(data);
    lastCacheTime = Date.now();
    logger.info('Kaomojis loaded successfully.');
    return kaomojiCache;
  } catch (error) {
    logger.error('Error loading kaomojis:', error);
    throw new Error('Failed to load kaomojis data');
  }
}

/**
 * Loads tweet message templates from the JSON file
 */
async function loadMessages() {
  if (messagesCache && !isCacheExpired()) {
    return messagesCache;
  }
  
  try {
    const data = await fs.readFile(config.files.messages, 'utf8');
    messagesCache = JSON.parse(data);
    lastCacheTime = Date.now();
    logger.info('Message templates loaded successfully.');
    return messagesCache;
  } catch (error) {
    // If file doesn't exist, create default messages
    if (error.code === 'ENOENT') {
      logger.warn('Messages file not found, creating default messages...');
      return createDefaultMessages();
    }
    
    logger.error('Error loading messages:', error);
    throw new Error('Failed to load message templates');
  }
}

/**
 * Creates default message templates if file doesn't exist
 */
async function createDefaultMessages() {
  const defaultMessages = {
    greetings: [
      "Hello world! {kaomoji}",
      "Good day everyone! {kaomoji}",
      "Kaomoji of the hour! {kaomoji}",
      "Sending good vibes {kaomoji}",
      "Hope you're having a great day! {kaomoji}",
      "Greetings, Twitter friends! {kaomoji}"
    ],
    moods: [
      "Feeling happy today {kaomoji}",
      "Having a relaxing day {kaomoji}",
      "Energetic vibes {kaomoji}",
      "Just chilling {kaomoji}",
      "Feeling playful {kaomoji}",
      "So sleepy today {kaomoji}",
      "Food cravings hitting hard {kaomoji}",
      "Feeling loved {kaomoji}",
      "Surprised by how the day went {kaomoji}"
    ],
    weather: [
      "Sunny day kaomoji {kaomoji}",
      "Rainy day mood {kaomoji}",
      "Cozy weather outside {kaomoji}",
      "Perfect weather for kaomojis {kaomoji}",
      "Snow day vibes {kaomoji}",
      "Staying cool in this heat {kaomoji}"
    ],
    weekdays: [
      "Monday motivation {kaomoji}",
      "Taco Tuesday {kaomoji}",
      "Wednesday wisdom {kaomoji}",
      "Thursday thoughts {kaomoji}",
      "Friday feelings {kaomoji}",
      "Saturday fun {kaomoji}",
      "Sunday relaxation {kaomoji}"
    ],
    times: [
      "Morning kaomoji vibes {kaomoji}",
      "Afternoon pick-me-up {kaomoji}",
      "Evening wind-down {kaomoji}",
      "Late night thoughts {kaomoji}"
    ],
    activities: [
      "Reading with kaomojis {kaomoji}",
      "Coding session in progress {kaomoji}",
      "Gaming time {kaomoji}",
      "Music appreciation {kaomoji}",
      "Creative mode activated {kaomoji}"
    ],
    responses: {
      general: [
        "Thanks for the mention! {kaomoji}",
        "Hello there! {kaomoji}",
        "Nice to meet you! {kaomoji}",
        "Thanks for reaching out {kaomoji}",
        "Hope you're having a great day! {kaomoji}"
      ],
      happy: [
        "Glad you're happy! {kaomoji}",
        "Happiness looks good on you! {kaomoji}",
        "Keep smiling! {kaomoji}"
      ],
      sad: [
        "Sending virtual hugs {kaomoji}",
        "Things will get better {kaomoji}",
        "Here's a kaomoji to cheer you up {kaomoji}"
      ],
      question: [
        "Great question! {kaomoji}",
        "Let me think about that {kaomoji}",
        "Here's a kaomoji for your question {kaomoji}"
      ],
      food: [
        "Yummy thoughts! {kaomoji}",
        "Food kaomojis are the best {kaomoji}",
        "Getting hungry now {kaomoji}"
      ]
    },
    hashtags: [
      "#kaomoji", "#emoji", "#kawaii", "#textart", 
      "#cute", "#emoticons", "#TwitterBot", "#Japan",
      "#TextFaces", "#Unicode", "#AsciiArt", "#MoodOfTheDay",
      "#ExpressYourself", "#DigitalArt", "#TypeArt"
    ],
    specialDays: {
      // These will be dynamically added from the specialDays object
    }
  };
  
  try {
    const dir = path.dirname(config.files.messages);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(
      config.files.messages, 
      JSON.stringify(defaultMessages, null, 2), 
      'utf8'
    );
    
    messagesCache = defaultMessages;
    lastCacheTime = Date.now();
    logger.info('Default messages created and saved.');
    return defaultMessages;
  } catch (error) {
    logger.error('Error creating default messages:', error);
    return defaultMessages; // Return defaults even if save fails
  }
}

/**
 * Gets one or more random kaomojis
 */
async function getRandomKaomojis(count = 1) {
  const kaomojis = await loadKaomojis();
  const categories = Object.keys(kaomojis);
  const selectedKaomojis = [];
  
  for (let i = 0; i < count; i++) {
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const kaomojiList = kaomojis[randomCategory];
    const randomKaomoji = kaomojiList[Math.floor(Math.random() * kaomojiList.length)];
    selectedKaomojis.push(randomKaomoji);
  }
  
  return selectedKaomojis;
}

/**
 * Gets a random kaomoji by mood/category
 */
async function getKaomojiByCategory(category) {
  const kaomojis = await loadKaomojis();
  
  // If category doesn't exist, use a random one
  if (!kaomojis[category]) {
    const categories = Object.keys(kaomojis);
    category = categories[Math.floor(Math.random() * categories.length)];
  }
  
  const kaomojiList = kaomojis[category];
  return kaomojiList[Math.floor(Math.random() * kaomojiList.length)];
}

/**
 * Gets random message template by type
 */
async function getRandomMessage(type) {
  const messages = await loadMessages();
  
  // If type doesn't exist, use a random type
  if (!messages[type]) {
    const types = Object.keys(messages).filter(key => 
      key !== 'hashtags' && key !== 'responses' && key !== 'specialDays'
    );
    type = types[Math.floor(Math.random() * types.length)];
  }
  
  const messageList = messages[type];
  return messageList[Math.floor(Math.random() * messageList.length)];
}

/**
 * Gets a response message based on content analysis
 */
async function getResponseMessage(mentionText) {
  const messages = await loadMessages();
  const responses = messages.responses;
  const lowerText = mentionText.toLowerCase();
  
  // Determine the type of response based on text analysis
  let responseType = 'general';
  
  if (lowerText.includes('happy') || lowerText.includes('joy') || lowerText.includes('glad') || lowerText.includes('wonderful')) {
    responseType = 'happy';
  } else if (lowerText.includes('sad') || lowerText.includes('unhappy') || lowerText.includes('depressed') || lowerText.includes('feeling down')) {
    responseType = 'sad';
  } else if (lowerText.includes('?') || lowerText.includes('what') || lowerText.includes('how') || lowerText.includes('why') || lowerText.includes('when')) {
    responseType = 'question';
  } else if (lowerText.includes('food') || lowerText.includes('hungry') || lowerText.includes('eat') || lowerText.includes('lunch') || lowerText.includes('dinner')) {
    responseType = 'food';
  }
  
  // Get the appropriate response list, fallback to general if not found
  const responseList = responses[responseType] || responses.general;
  return responseList[Math.floor(Math.random() * responseList.length)];
}

/**
 * Gets random hashtags
 */
async function getRandomHashtags(count = 2) {
  const messages = await loadMessages();
  const hashtags = messages.hashtags || config.defaultHashtags;
  
  // Shuffle hashtags and take the first 'count'
  const shuffled = [...hashtags].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Gets trending hashtags to include in tweets
 */
async function getTrendingHashtags(trendingData, count = 1) {
  if (!trendingData || !trendingData.data || trendingData.data.length === 0) {
    return [];
  }
  
  // Filter trending hashtags (starting with #)
  const trendingHashtags = trendingData.data
    .filter(trend => trend.name.startsWith('#'))
    .sort((a, b) => (b.tweet_volume || 0) - (a.tweet_volume || 0))
    .map(trend => trend.name);
  
  // If no hashtags found, return empty array
  if (trendingHashtags.length === 0) {
    return [];
  }
  
  // Take a random selection from the top trends
  const topTrends = trendingHashtags.slice(0, Math.min(10, trendingHashtags.length));
  const shuffled = [...topTrends].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Checks if today is a special day
 */
function getTodaySpecialDay() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateKey = `${month}/${day}`;
  
  return specialDays[dateKey] || null;
}

/**
 * Gets a special day message if today is a special day
 */
async function getSpecialDayContent() {
  if (!config.useSpecialDayThemes) {
    return null;
  }
  
  const specialDay = getTodaySpecialDay();
  if (!specialDay) {
    return null;
  }
  
  // Get a kaomoji for the special day
  const kaomoji = await getKaomojiByCategory(specialDay.category);
  
  // Replace the {kaomoji} placeholder with the actual kaomoji
  const message = specialDay.template.replace('{kaomoji}', kaomoji);
  
  return {
    message,
    kaomoji,
    hashtags: specialDay.hashtags,
    specialDay: specialDay.name
  };
}

/**
 * Track kaomoji usage for popularity stats
 */
async function trackKaomojiUsage(kaomoji, twitterClient) {
  try {
    // Load current stats
    const stats = await twitterClient.loadStats();
    
    // Update kaomoji popularity
    if (!stats.popularKaomojis) {
      stats.popularKaomojis = {};
    }
    
    if (stats.popularKaomojis[kaomoji]) {
      stats.popularKaomojis[kaomoji]++;
    } else {
      stats.popularKaomojis[kaomoji] = 1;
    }
    
    // Save updated stats
    await twitterClient.saveStats(stats);
  } catch (error) {
    logger.error('Error tracking kaomoji usage:', error);
  }
}

/**
 * Track category usage for stats
 */
async function trackCategoryUsage(category, twitterClient) {
  try {
    // Load current stats
    const stats = await twitterClient.loadStats();
    
    // Update category stats
    if (!stats.categoryStats) {
      stats.categoryStats = {};
    }
    
    if (stats.categoryStats[category]) {
      stats.categoryStats[category]++;
    } else {
      stats.categoryStats[category] = 1;
    }
    
    // Save updated stats
    await twitterClient.saveStats(stats);
  } catch (error) {
    logger.error('Error tracking category usage:', error);
  }
}

/**
 * Get the time-appropriate content based on hour of day
 */
function getTimeBasedType() {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return 'morning';
  } else if (hour >= 12 && hour < 17) {
    return 'afternoon';
  } else if (hour >= 17 && hour < 22) {
    return 'evening';
  } else {
    return 'night';
  }
}

/**
 * Get the day of week for contextual content
 */
function getDayOfWeekType() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = new Date().getDay();
  return days[dayIndex];
}

/**
 * Create a contextually appropriate tweet based on time, day, etc.
 */
async function createContextualTweet(twitterClient) {
  // Check for special day first
  const specialDayContent = await getSpecialDayContent();
  if (specialDayContent) {
    return specialDayContent;
  }
  
  // Get contextual types
  const timeType = getTimeBasedType();
  const dayType = getDayOfWeekType();
  
  // Randomly choose between time-based and day-based content
  const contextType = Math.random() > 0.5 ? 'times' : 'weekdays';
  const messageType = contextType === 'times' ? 'times' : 'weekdays';
  
  // Get trending topics if enabled
  let trendingHashtags = [];
  if (config.useTrendingTopics) {
    const trendingData = await twitterClient.getTrendingTopics();
    trendingHashtags = await getTrendingHashtags(trendingData, config.maxTrendingHashtags);
  }
  
  // Get random hashtags and add trending ones
  const randomHashtags = await getRandomHashtags(2);
  const hashtags = [...randomHashtags, ...trendingHashtags];
  
  // Get appropriate message
  let message = await getRandomMessage(messageType);
  
  // Get random kaomoji
  const category = Math.random() > 0.7 ? 'happy' : getRandomCategory();
  const kaomoji = await getKaomojiByCategory(category);
  
  // Track usage
  await trackKaomojiUsage(kaomoji, twitterClient);
  await trackCategoryUsage(category, twitterClient);
  
  // Replace placeholder with kaomoji
  message = message.replace('{kaomoji}', kaomoji);
  
  return {
    message,
    kaomoji,
    hashtags,
    category
  };
}

/**
 * Get a random category from available kaomojis
 */
async function getRandomCategory() {
  const kaomojis = await loadKaomojis();
  const categories = Object.keys(kaomojis);
  return categories[Math.floor(Math.random() * categories.length)];
}

/**
 * Get the most popular kaomojis from stats
 */
async function getPopularKaomojis(twitterClient, count = 5) {
  try {
    const stats = await twitterClient.loadStats();
    
    if (!stats.popularKaomojis) {
      return [];
    }
    
    // Convert to array of [kaomoji, count] pairs and sort by count
    const popularityArray = Object.entries(stats.popularKaomojis)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count);
    
    return popularityArray.map(item => item[0]);
  } catch (error) {
    logger.error('Error getting popular kaomojis:', error);
    return [];
  }
}

module.exports = {
  getRandomKaomojis,
  getKaomojiByCategory,
  getRandomMessage,
  getResponseMessage,
  getRandomHashtags,
  getTrendingHashtags,
  getSpecialDayContent,
  createContextualTweet,
  trackKaomojiUsage,
  trackCategoryUsage,
  getPopularKaomojis,
  getRandomCategory
};
