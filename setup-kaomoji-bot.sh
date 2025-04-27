#!/bin/bash
# Kaomoji Twitter Bot Setup Script for DigitalOcean
# This script automates the deployment of the Kaomoji Twitter Bot on a DigitalOcean droplet

# Exit on error
set -e

echo "===== Kaomoji Twitter Bot Setup ====="
echo "This script will install and configure the Kaomoji Twitter Bot on your DigitalOcean droplet."
echo ""

# Update system packages
echo "Updating system packages..."
apt update
apt upgrade -y

# Install Node.js and npm
echo "Installing Node.js and npm..."
apt install -y nodejs npm git

# Install pm2 globally
echo "Installing PM2 process manager..."
npm install -y pm2 -g

# Verify installations
echo "Checking installed versions:"
node -v
npm -v
pm2 -v

# Create directory for the bot
echo "Creating directory for the bot..."
mkdir -p /opt/kaomoji-bot
cd /opt/kaomoji-bot

# Clone the repository
echo "Cloning the Kaomoji Twitter Bot repository..."
git clone https://github.com/YOUR_USERNAME/kaomoji-twitter-bot.git .

# If the repository URL above doesn't exist, you'll need to upload your files manually
# Uncomment these lines if you need to manually upload:
# echo "NOTE: You'll need to manually upload your bot files to /opt/kaomoji-bot/"
# echo "Use: scp -r /path/to/your/project/* root@YOUR_DROPLET_IP:/opt/kaomoji-bot/"

# Install dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env file template
echo "Creating .env file template..."
cat > .env.template << EOL
# Twitter API Credentials - Using Twitter API v2 Free Tier
API_KEY=your_twitter_api_key_here
API_SECRET_KEY=your_twitter_api_secret_here
ACCESS_TOKEN=your_twitter_access_token_here
ACCESS_TOKEN_SECRET=your_twitter_access_token_secret_here

# Bot Configuration
LOG_LEVEL=info

# Set to false for real Twitter API usage
MOCK_MODE=false
EOL

cp .env.template .env

# Create update script
echo "Creating update script..."
cat > /opt/update-kaomoji-bot.sh << EOL
#!/bin/bash
cd /opt/kaomoji-bot
git pull
npm install
pm2 restart kaomoji-twitter-bot
EOL

chmod +x /opt/update-kaomoji-bot.sh

# Setup automatic updates via cron
echo "Setting up automatic weekly updates..."
(crontab -l 2>/dev/null || echo "") | grep -v "update-kaomoji-bot.sh" | { cat; echo "0 0 * * 0 /opt/update-kaomoji-bot.sh"; } | crontab -

# Setup instructions
echo ""
echo "===== Setup Complete! ====="
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your Twitter API credentials:"
echo "   nano /opt/kaomoji-bot/.env"
echo ""
echo "2. Start the bot with PM2:"
echo "   cd /opt/kaomoji-bot && pm2 start index.js --name kaomoji-twitter-bot"
echo ""
echo "3. Make PM2 start on system boot:"
echo "   pm2 startup"
echo "   (Run the command that appears)"
echo "   pm2 save"
echo ""
echo "4. To monitor your bot:"
echo "   pm2 list            - Check if the bot is running"
echo "   pm2 logs kaomoji-twitter-bot  - View logs"
echo "   pm2 monit           - Monitor resources"
echo ""
echo "Your Kaomoji Twitter Bot is now ready! Remember to check logs for any issues."