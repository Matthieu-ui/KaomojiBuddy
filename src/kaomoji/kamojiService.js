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
  // Major holidays
  '01/01': { name: 'New Year', template: 'Happy New Year! {kaomoji}', category: 'happy', hashtags: ['#NewYear', '#HappyNewYear'] },
  '02/14': { name: 'Valentine\'s Day', template: 'Happy Valentine\'s Day! {kaomoji}', category: 'love', hashtags: ['#ValentinesDay', '#Love'] },
  '03/17': { name: 'St. Patrick\'s Day', template: 'Happy St. Patrick\'s Day! {kaomoji}', category: 'happy', hashtags: ['#StPatricksDay', '#Lucky'] },
  '04/01': { name: 'April Fools', template: 'Happy April Fools\' Day! {kaomoji}', category: 'surprised', hashtags: ['#AprilFools', '#Pranks'] },
  '04/22': { name: 'Earth Day', template: 'Happy Earth Day! Let\'s take care of our planet {kaomoji}', category: 'happy', hashtags: ['#EarthDay', '#Environment'] },
  '05/05': { name: 'Cinco de Mayo', template: 'Happy Cinco de Mayo! {kaomoji}', category: 'happy', hashtags: ['#CincoDeMayo', '#Celebration'] },
  '07/04': { name: 'Independence Day', template: 'Happy 4th of July! {kaomoji}', category: 'happy', hashtags: ['#IndependenceDay', '#4thOfJuly'] },
  '10/31': { name: 'Halloween', template: 'Happy Halloween! {kaomoji}', category: 'surprised', hashtags: ['#Halloween', '#Spooky'] },
  '11/24': { name: 'Thanksgiving', template: 'Happy Thanksgiving! Grateful for kaomojis {kaomoji}', category: 'happy', hashtags: ['#Thanksgiving', '#Grateful'] },
  '12/25': { name: 'Christmas', template: 'Merry Christmas! {kaomoji}', category: 'happy', hashtags: ['#MerryChristmas', '#Christmas'] },
  '12/31': { name: 'New Year\'s Eve', template: 'Happy New Year\'s Eve! {kaomoji}', category: 'happy', hashtags: ['#NewYearsEve', '#Countdown'] },
  
  // Fun internet days
  '02/07': { name: 'Send a Card Day', template: 'It\'s Send a Card Day! Here\'s a digital kaomoji card for you {kaomoji}', category: 'love', hashtags: ['#SendACardDay', '#DigitalCard'] },
  '03/14': { name: 'Pi Day', template: 'Happy Pi Day! 3.14159... {kaomoji}', category: 'happy', hashtags: ['#PiDay', '#Math'] },
  '04/12': { name: 'National Grilled Cheese Day', template: 'It\'s National Grilled Cheese Day! {kaomoji}', category: 'food', hashtags: ['#GrilledCheeseDay', '#FoodLove'] },
  '05/04': { name: 'Star Wars Day', template: 'May the 4th be with you! {kaomoji}', category: 'happy', hashtags: ['#StarWarsDay', '#MayThe4thBeWithYou'] },
  '06/18': { name: 'International Sushi Day', template: 'Happy International Sushi Day! {kaomoji}', category: 'food', hashtags: ['#SushiDay', '#FoodieLife'] },
  '07/17': { name: 'World Emoji Day', template: 'Happy World Emoji Day from a kaomoji fan! {kaomoji}', category: 'happy', hashtags: ['#WorldEmojiDay', '#Kaomoji'] },
  '08/08': { name: 'International Cat Day', template: 'Meow! It\'s International Cat Day! {kaomoji}', category: 'happy', hashtags: ['#InternationalCatDay', '#CatLove'] },
  '09/19': { name: 'Talk Like a Pirate Day', template: 'Ahoy matey! It be Talk Like a Pirate Day! {kaomoji}', category: 'happy', hashtags: ['#TalkLikeAPirateDay', '#Pirate'] },
  '10/01': { name: 'International Coffee Day', template: 'Happy International Coffee Day! {kaomoji}', category: 'food', hashtags: ['#InternationalCoffeeDay', '#Coffee'] },
  '11/11': { name: 'Origami Day', template: 'Happy Origami Day! Paper folding is an art {kaomoji}', category: 'happy', hashtags: ['#OrigamiDay', '#JapaneseArt'] }
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
      "Staying cool in this heat {kaomoji}",
      "Cloudy with a chance of kaomojis {kaomoji}",
      "Foggy morning thoughts {kaomoji}",
      "When it rains, it kaomojis {kaomoji}",
      "Thunder and kaomojis {kaomoji}",
      "Windy day hair problems {kaomoji}",
      "Sunshine and good vibes {kaomoji}",
      "Rainy day coziness {kaomoji}",
      "Hot summer kaomoji {kaomoji}",
      "Let it snow, let it kaomoji {kaomoji}",
      "Weather update: 100% chance of kaomojis {kaomoji}"
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
      "Late night thoughts {kaomoji}",
      "Early morning motivation {kaomoji}",
      "Starting the day with a kaomoji {kaomoji}",
      "Lunchtime kaomoji break {kaomoji}",
      "Dinnertime kaomoji served fresh {kaomoji}",
      "Coffee break with a kaomoji {kaomoji}",
      "Sunset kaomoji vibes {kaomoji}",
      "Midnight kaomoji for the night owls {kaomoji}"
    ],
    seasonal: [
      "Spring has sprung {kaomoji}",
      "Summer vibes {kaomoji}",
      "Autumn leaves and kaomojis {kaomoji}",
      "Winter wonderland {kaomoji}",
      "Cherry blossom season {kaomoji}",
      "Beach day kaomoji {kaomoji}",
      "Cozy fall kaomoji {kaomoji}",
      "Snowy day kaomoji {kaomoji}",
      "Spring cleaning with kaomojis {kaomoji}",
      "Summer vacation mood {kaomoji}",
      "Autumn colors {kaomoji}",
      "Winter coziness {kaomoji}"
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
      // General hashtags
      "#kaomoji", "#emoji", "#kawaii", "#textart", 
      "#cute", "#emoticons", "#TwitterBot", "#Japan",
      "#TextFaces", "#Unicode", "#AsciiArt", "#MoodOfTheDay",
      "#ExpressYourself", "#DigitalArt", "#TypeArt",
      
      // Seasonal hashtags - Spring
      "#SpringVibes", "#BlossomSeason", "#SpringFling",
      "#SpringMood", "#SpringFever", "#FreshStart",
      
      // Seasonal hashtags - Summer
      "#SummerVibes", "#SummerFun", "#BeachDay",
      "#SummerMood", "#HotDay", "#Sunshine",
      
      // Seasonal hashtags - Autumn/Fall
      "#AutumnVibes", "#FallMood", "#AutumnLeaves",
      "#CozyAutumn", "#FallColors", "#SweaterWeather",
      
      // Seasonal hashtags - Winter
      "#WinterVibes", "#SnowDay", "#WinterWonderland",
      "#CozyWinter", "#WinterMood", "#HolidaySeason",
      
      // Time-of-day hashtags
      "#MorningVibes", "#LunchBreak", "#AfternoonDelight",
      "#EveningVibes", "#NightOwl", "#MidnightThoughts",
      
      // Weather hashtags
      "#SunnyDay", "#RainyMood", "#CloudyDay",
      "#ThunderStorm", "#FoggyMorning", "#WindyDay"
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
 * More specific time periods for better contextual relevance
 */
function getTimeBasedType() {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 8) {
    return 'early_morning'; // Early morning (5am-8am)
  } else if (hour >= 8 && hour < 12) {
    return 'morning';       // Morning (8am-12pm)
  } else if (hour >= 12 && hour < 14) {
    return 'lunch';         // Lunch time (12pm-2pm)
  } else if (hour >= 14 && hour < 17) {
    return 'afternoon';     // Afternoon (2pm-5pm)
  } else if (hour >= 17 && hour < 19) {
    return 'dinner';        // Dinner time (5pm-7pm)
  } else if (hour >= 19 && hour < 22) {
    return 'evening';       // Evening (7pm-10pm)
  } else if (hour >= 22 || hour < 1) {
    return 'late_night';    // Late night (10pm-1am)
  } else {
    return 'night';         // Night (1am-5am)
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
 * Get the current season based on northern hemisphere
 * Provides seasonal context for tweets
 */
function getCurrentSeason() {
  const now = new Date();
  const month = now.getMonth(); // 0-11 (Jan-Dec)
  
  if (month >= 2 && month <= 4) {
    return 'spring';      // March, April, May
  } else if (month >= 5 && month <= 7) {
    return 'summer';      // June, July, August
  } else if (month >= 8 && month <= 10) {
    return 'autumn';      // September, October, November
  } else {
    return 'winter';      // December, January, February
  }
}

/**
 * Get a mock weather condition for contextual tweets
 * Used only in mock mode for variety
 */
function getMockWeather() {
  const weatherTypes = ['sunny', 'cloudy', 'rainy', 'snowy', 'stormy', 'windy', 'foggy'];
  const randomIndex = Math.floor(Math.random() * weatherTypes.length);
  return weatherTypes[randomIndex];
}

/**
 * Create a contextually appropriate tweet based on time, day, season, and trends
 * Enhanced with more contextual awareness features
 */
async function createContextualTweet(twitterClient) {
  // Check for special day first (highest priority)
  const specialDayContent = await getSpecialDayContent();
  if (specialDayContent) {
    return specialDayContent;
  }
  
  // Get contextual factors
  const timeType = getTimeBasedType();      // Specific time of day
  const dayType = getDayOfWeekType();       // Day of the week
  const season = getCurrentSeason();        // Current season
  const mockWeather = getMockWeather();     // Mock weather (for variety)
  
  // Get trending topics if enabled
  let trendingHashtags = [];
  let trendingTopics = [];
  if (config.useTrendingTopics) {
    const trendingData = await twitterClient.getTrendingTopics();
    trendingHashtags = await getTrendingHashtags(trendingData, config.maxTrendingHashtags);
    
    // Extract clean topic names without the hashtag symbol for possible content integration
    trendingTopics = trendingHashtags.map(tag => tag.replace('#', '').toLowerCase());
  }
  
  // Choose context type with weighted randomness
  const rand = Math.random();
  let contextType;
  let messageType;
  let category;
  
  // Dynamic content selection based on time and context
  if (rand < 0.3) {
    // 30% chance - Time-focused content (morning, evening, etc.)
    contextType = 'time';
    messageType = 'times';
    
    // Match kaomoji category to time of day
    if (timeType === 'early_morning' || timeType === 'morning') {
      category = Math.random() > 0.5 ? 'happy' : 'sleepy';
    } else if (timeType === 'lunch' || timeType === 'dinner') {
      category = Math.random() > 0.5 ? 'happy' : 'food';
    } else if (timeType === 'evening') {
      category = Math.random() > 0.7 ? 'happy' : 'love';
    } else if (timeType === 'late_night' || timeType === 'night') {
      category = Math.random() > 0.6 ? 'sleepy' : 'surprised';
    } else {
      category = 'happy';
    }
  } 
  else if (rand < 0.6) {
    // 30% chance - Day of week content
    contextType = 'day';
    messageType = 'weekdays';
    
    // Match kaomoji category to day of week
    if (dayType === 'monday') {
      category = Math.random() > 0.7 ? 'worried' : 'sleepy';
    } else if (dayType === 'friday') {
      category = 'happy';
    } else if (dayType === 'saturday' || dayType === 'sunday') {
      category = Math.random() > 0.5 ? 'happy' : 'love';
    } else {
      category = getRandomCategory();
    }
  }
  else if (rand < 0.8) {
    // 20% chance - Seasonal content
    contextType = 'season';
    messageType = 'weather'; // Reusing weather templates for seasonal content
    
    // Match kaomoji category to season
    if (season === 'spring') {
      category = Math.random() > 0.5 ? 'happy' : 'love';
    } else if (season === 'summer') {
      category = Math.random() > 0.7 ? 'happy' : 'surprised';
    } else if (season === 'autumn') {
      category = Math.random() > 0.6 ? 'happy' : 'worried';
    } else if (season === 'winter') {
      category = Math.random() > 0.5 ? 'happy' : 'sleepy';
    } else {
      category = 'happy';
    }
  }
  else {
    // 20% chance - Weather-themed content (using mock weather)
    contextType = 'weather';
    messageType = 'weather';
    
    // Match kaomoji category to weather
    if (mockWeather === 'sunny') {
      category = 'happy';
    } else if (mockWeather === 'rainy' || mockWeather === 'stormy') {
      category = Math.random() > 0.5 ? 'worried' : 'sad';
    } else if (mockWeather === 'snowy') {
      category = Math.random() > 0.7 ? 'surprised' : 'happy';
    } else {
      category = getRandomCategory();
    }
  }
  
  // Get random hashtags and add trending ones
  const randomHashtags = await getRandomHashtags(2);
  const hashtags = [...randomHashtags, ...trendingHashtags];
  
  // Get appropriate message template
  let message = await getRandomMessage(messageType);
  
  // Get appropriate kaomoji from selected category
  const kaomoji = await getKaomojiByCategory(category);
  
  // Track usage for stats
  await trackKaomojiUsage(kaomoji, twitterClient);
  await trackCategoryUsage(category, twitterClient);
  
  // Format contextual information for the tweet
  let contextInfo = '';
  if (contextType === 'time') {
    // Format time-specific content
    const formattedTime = timeType.replace('_', ' ');
    contextInfo = formattedTime.charAt(0).toUpperCase() + formattedTime.slice(1);
  } 
  else if (contextType === 'season') {
    // Add seasonal context
    contextInfo = season.charAt(0).toUpperCase() + season.slice(1);
  }
  else if (contextType === 'weather') {
    // Add weather context
    contextInfo = mockWeather.charAt(0).toUpperCase() + mockWeather.slice(1);
  }
  
  // Replace placeholder with kaomoji
  message = message.replace('{kaomoji}', kaomoji);
  
  // Occasionally add trending topic reference if available
  if (trendingTopics.length > 0 && Math.random() > 0.7) {
    const randomTrend = trendingTopics[Math.floor(Math.random() * trendingTopics.length)];
    if (message.includes('?')) {
      // If message ends with question mark, don't modify it
    } else if (!message.endsWith('.') && !message.endsWith('!')) {
      message += ` (trending: ${randomTrend})`;
    }
  }
  
  logger.info(`Created ${contextType}-based contextual tweet with ${category} kaomoji`);
  
  return {
    message,
    kaomoji,
    hashtags,
    category,
    contextType
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
  getRandomCategory,
  getTimeBasedType,
  getDayOfWeekType,
  getCurrentSeason,
  getMockWeather,
  getTodaySpecialDay
};
