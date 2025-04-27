# Kaomoji Twitter Bot

A Twitter bot that posts kaomojis and interacts with users, built with Node.js.

## Features

- 📅 Scheduled posting of kaomojis at regular intervals
- 🔄 Variety in tweet content (simple, enhanced, trending topics)
- 💬 Auto-responds to mentions with contextually appropriate kaomojis
- 📊 Tracks statistics about popular kaomojis and user interactions
- 🎭 Different responses based on mood detection in user messages
- 📈 Posts weekly stats and thanks active users
- 🕒 Time-aware content with special messages for different times of day
- 🗓️ Day-of-week contextual awareness for more relevant content
- 🌱 Seasonal content themes (Spring, Summer, Autumn, Winter)
- 🌤️ Weather-themed messages that provide variety
- 🎉 Special day content for holidays and celebrations
- 📱 Smart trending topic integration that matches trends to kaomoji categories

## Getting Started

### Prerequisites

- Node.js and npm installed
- Twitter Developer Account (for production mode)
- Twitter API credentials (for production mode)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - For development: keep `MOCK_MODE=true`
   - For production: set `MOCK_MODE=false` and add your Twitter API credentials

### Configuration

All bot settings are in `src/config.js`. You can customize:

- Posting frequency
- Tweet content variety
- Hashtag usage
- Interaction behavior
- Stats tracking

### Running the Bot

```
# Start the bot with settings from .env
npm start
```

## Development Mode

The bot can run in mock mode without Twitter API credentials. Set `MOCK_MODE=true` in your `.env` file.

In mock mode:
- No real tweets are posted
- Mentions and interactions are simulated
- Perfect for testing without API access

## Twitter API Setup

To use with a real Twitter account:

1. Create a Twitter Developer Account: [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a Project and App with Elevated access
3. Generate API Key, API Secret, Access Token, and Access Token Secret
4. Add these credentials to your `.env` file:
   ```
   API_KEY=your_twitter_api_key
   API_SECRET_KEY=your_twitter_api_secret
   ACCESS_TOKEN=your_twitter_access_token
   ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
   MOCK_MODE=false
   ```

## Customization

### Kaomoji Database

Edit `data/kaomojis.json` to add your own kaomojis in different categories.

### Message Templates

Edit `data/messages.json` to customize the text that accompanies kaomojis.

## License

This project is licensed under the MIT License.