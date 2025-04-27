/**
 * Kaomoji Twitter Bot 
 * ------------------
 * A bot that posts kaomojis and interacts with users on Twitter.
 * 
 * CONFIGURATION:
 * 1. Copy .env.example to .env
 * 2. For development/testing: keep MOCK_MODE=true (no Twitter API needed)
 * 3. For production deployment:
 *    - Set MOCK_MODE=false
 *    - Add your Twitter API credentials (see .env.example for details)
 *    - Get credentials from https://developer.twitter.com/en/portal/dashboard
 * 
 * RUNNING THE BOT:
 * - npm install
 * - npm start
 */

const schedule = require('node-schedule');
const logger = require('./src/utils/logger');
const tweetService = require('./src/bot/tweetService');
const interactionService = require('./src/bot/interactionService');
const config = require('./src/config');
const twitterClient = require('./src/twitterClient');

// Initialize the bot
async function initializeBot() {
  logger.info('Kaomoji Twitter bot starting...');
  
  try {
    // Create the stats directory and initial stats if needed
    await twitterClient.loadStats();
    
    // Schedule regular kaomoji tweets (hourly by default)
    schedule.scheduleJob(config.postSchedule, async function job() {
      try {
        logger.info('Scheduled tweet job triggered at ' + new Date().toISOString());
        await tweetService.postRandomContent();
      } catch (error) {
        logger.error('Error in scheduled tweet job:', error);
      }
    });
    
    // Schedule interaction checks (every 15 minutes by default)
    schedule.scheduleJob(config.interactionSchedule, async function job() {
      try {
        logger.info('Checking for interactions at ' + new Date().toISOString());
        await interactionService.handleMentions();
      } catch (error) {
        logger.error('Error in interaction check job:', error);
      }
    });
    
    // Schedule daily stats posting (at midnight by default)
    schedule.scheduleJob(config.statsSchedule, async function job() {
      try {
        logger.info('Posting daily stats at ' + new Date().toISOString());
        await tweetService.postStats();
      } catch (error) {
        logger.error('Error in stats posting job:', error);
      }
    });
    
    // Schedule weekly thanks to active users (Sundays at noon)
    schedule.scheduleJob('0 12 * * 0', async function job() {
      try {
        logger.info('Posting weekly thanks to active users at ' + new Date().toISOString());
        await interactionService.postActiveUsersThanks();
      } catch (error) {
        logger.error('Error in active users thanks job:', error);
      }
    });
    
    // Post an initial tweet to confirm the bot is running
    if (config.postOnStartup) {
      logger.info('Posting startup tweet...');
      await tweetService.postStartupMessage();
    }
    
    logger.info('Bot successfully initialized! ٩(◕‿◕｡)۶');
    
    // Log operating mode
    logger.info(`Bot running in ${config.mockMode ? 'MOCK' : 'LIVE'} mode`);
    
    // Log scheduled tasks
    const scheduledJobs = Object.keys(schedule.scheduledJobs);
    logger.info(`Scheduled tasks: ${scheduledJobs.length} jobs`);
    
  } catch (error) {
    logger.error('Initialization error:', error);
    throw error; // Propagate to the main catch handler
  }
}

// Create function to add a mock mention for testing
async function addTestMention(text, username = 'test_user') {
  if (config.mockMode) {
    await twitterClient.addMockMention({
      text: `@kaomoji_bot_mock ${text}`,
      author_id: '33333333',
      username: username,
      name: 'Test User'
    });
    logger.info(`Added mock mention from @${username}: ${text}`);
    return true;
  } else {
    logger.warn('Cannot add test mentions in non-mock mode');
    return false;
  }
}

// Add some initial test mentions if in mock mode
async function addInitialTestMentions() {
  if (config.mockMode) {
    // Wait a moment to ensure initialization is complete
    setTimeout(async () => {
      await addTestMention('Hello! Can I get a happy kaomoji?', 'happy_user');
      await addTestMention('I\'m feeling sad today...', 'sad_user');
      await addTestMention('What can you do?', 'curious_user');
      await addTestMention('Show me your stats', 'data_user');
    }, 5000);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Bot is shutting down... (◡﹏◡✿)');
  schedule.gracefulShutdown()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    });
});

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Promise Rejection:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the bot
initializeBot()
  .then(async () => {
    if (config.mockMode) {
      addInitialTestMentions();
      
      // Process mentions immediately after adding them in mock mode
      setTimeout(async () => {
        logger.info('Processing mentions immediately in mock mode...');
        await interactionService.handleMentions();
      }, 6000); // Wait 6 seconds after adding the test mentions (which happens after 5s)
    }
  })
  .catch(err => {
    logger.error('Failed to initialize bot:', err);
    process.exit(1);
  });
