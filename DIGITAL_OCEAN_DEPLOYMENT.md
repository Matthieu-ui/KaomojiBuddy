# Deploying Kaomoji Twitter Bot on DigitalOcean

This guide provides step-by-step instructions for deploying the Kaomoji Twitter Bot on a DigitalOcean droplet.

## Prerequisites

1. A DigitalOcean account
2. Basic knowledge of Linux commands
3. Twitter API credentials (API Key, API Secret, Access Token, Access Token Secret)

## Step 1: Create a Droplet

1. Log in to your DigitalOcean account
2. Click "Create" > "Droplets"
3. Choose an image: Ubuntu 22.04 LTS
4. Select a plan: Basic shared CPU ($5/mo is sufficient)
5. Choose a datacenter region (pick one close to you)
6. Add your SSH keys or choose password authentication
7. Give your droplet a name (e.g., "kaomoji-twitter-bot")
8. Click "Create Droplet"

## Step 2: Connect to Your Droplet

Connect to your droplet via SSH:

```bash
ssh root@YOUR_DROPLET_IP
```

## Step 3: Install Required Software

Update your system and install Node.js:

```bash
# Update package lists
apt update

# Install Node.js and npm
apt install -y nodejs npm

# Install pm2 globally (for managing the bot process)
npm install -y pm2 -g

# Verify installations
node -v
npm -v
pm2 -v
```

## Step 4: Clone the Repository

```bash
# Create a directory for the bot
mkdir -p /opt/kaomoji-bot
cd /opt/kaomoji-bot

# Clone your repository or copy files (example using scp)
# From your local machine:
# scp -r /path/to/your/project/* root@YOUR_DROPLET_IP:/opt/kaomoji-bot/
```

## Step 5: Install Dependencies

```bash
cd /opt/kaomoji-bot
npm install
```

## Step 6: Configure Environment Variables

Create a `.env` file with your Twitter API credentials:

```bash
nano .env
```

Add the following content (replace with your actual credentials):

```
# Twitter API Credentials - Using Twitter API v2 Free Tier
API_KEY=your_twitter_api_key_here
API_SECRET_KEY=your_twitter_api_secret_here
ACCESS_TOKEN=your_twitter_access_token_here
ACCESS_TOKEN_SECRET=your_twitter_access_token_secret_here

# Bot Configuration
LOG_LEVEL=info

# Set to false for real Twitter API usage
MOCK_MODE=false
```

Save and exit (CTRL+X, then Y, then ENTER).

## Step 7: Setup PM2 for Process Management

PM2 will keep your bot running even after you log out and will restart it if it crashes:

```bash
# Start the bot with PM2
cd /opt/kaomoji-bot
pm2 start index.js --name "kaomoji-twitter-bot"

# Make PM2 start on system boot
pm2 startup
# Run the command that appears

# Save the PM2 process list
pm2 save
```

## Step 8: Monitor Your Bot

```bash
# Check if the bot is running
pm2 list

# View logs
pm2 logs kaomoji-twitter-bot

# Monitor resources
pm2 monit
```

## Maintenance Commands

```bash
# Restart the bot
pm2 restart kaomoji-twitter-bot

# Stop the bot
pm2 stop kaomoji-twitter-bot

# Start the bot
pm2 start kaomoji-twitter-bot
```

## Setting Up Automatic Updates (Optional)

Create a simple script to pull changes from your repository:

```bash
nano /opt/update-bot.sh
```

Add this content:

```bash
#!/bin/bash
cd /opt/kaomoji-bot
git pull
npm install
pm2 restart kaomoji-twitter-bot
```

Make it executable:

```bash
chmod +x /opt/update-bot.sh
```

Set up a cron job to run it weekly:

```bash
crontab -e
```

Add this line:

```
0 0 * * 0 /opt/update-bot.sh
```

This will run the update script every Sunday at midnight.

## Troubleshooting

1. **Bot is not posting tweets**: Check the logs with `pm2 logs kaomoji-twitter-bot` for any errors.
2. **API errors**: Ensure your Twitter API credentials are correct in the `.env` file.
3. **Rate limiting**: The bot is configured to work within Twitter API v2 free tier limits, but you might hit rate limits if you deploy multiple instances or interact with the Twitter API through other apps.

Remember that your bot is optimized for Twitter API v2 free tier, so it will:
- Post tweets every 3 days (to stay under 100 posts/month)
- Check for mentions twice a day
- Use static hashtags instead of trending topics
- Post statistics only once a month