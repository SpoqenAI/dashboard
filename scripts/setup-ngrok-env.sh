#!/bin/bash

# Setup script for configuring environment variables for ngrok development
# This script helps set up the required environment variables for production-ready development

set -e

echo "🚀 Spoqen Development Environment Setup for ngrok"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}Creating .env.local file...${NC}"
    touch .env.local
fi

# Function to update or add environment variable
update_env_var() {
    local var_name="$1"
    local var_value="$2"
    
    if grep -q "^${var_name}=" .env.local; then
        # Update existing variable
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s|^${var_name}=.*|${var_name}=${var_value}|" .env.local
        else
            # Linux
            sed -i "s|^${var_name}=.*|${var_name}=${var_value}|" .env.local
        fi
        echo -e "${GREEN}Updated ${var_name}${NC}"
    else
        # Add new variable
        echo "${var_name}=${var_value}" >> .env.local
        echo -e "${GREEN}Added ${var_name}${NC}"
    fi
}

# Function to prompt for ngrok URL
get_ngrok_url() {
    echo ""
    echo -e "${BLUE}🌐 ngrok URL Configuration${NC}"
    echo "If you're using ngrok for development, please provide your ngrok URL."
    echo "Example: https://abc123-456-789.ngrok-free.app"
    echo ""
    
    read -p "Enter your ngrok URL (or press Enter to skip): " ngrok_url
    
    if [ ! -z "$ngrok_url" ]; then
        # Validate URL format
        if [[ $ngrok_url =~ ^https?://.*ngrok.*\.app$ ]] || [[ $ngrok_url =~ ^https?://.*ngrok\.io$ ]]; then
            echo -e "${GREEN}✓ Valid ngrok URL format${NC}"
            return 0
        else
            echo -e "${RED}❌ Invalid ngrok URL format. Please use the full URL (e.g., https://abc123.ngrok-free.app)${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  Skipping ngrok URL setup${NC}"
        return 2
    fi
}

# Function to check required environment variables
check_required_vars() {
    echo ""
    echo -e "${BLUE}🔍 Checking Required Environment Variables${NC}"
    
    local missing_vars=()
    
    # Check Supabase variables
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        missing_vars+=("NEXT_PUBLIC_SUPABASE_URL")
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        missing_vars+=("NEXT_PUBLIC_SUPABASE_ANON_KEY")
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        missing_vars+=("SUPABASE_SERVICE_ROLE_KEY")
    fi
    
    # Check Vapi variables
    if [ -z "$VAPI_PRIVATE_KEY" ]; then
        missing_vars+=("VAPI_PRIVATE_KEY")
    fi
    
    if [ -z "$VAPI_WEBHOOK_SECRET" ]; then
        missing_vars+=("VAPI_WEBHOOK_SECRET")
    fi
    
    # Check Twilio variables
    if [ -z "$TWILIO_ACCOUNT_SID" ]; then
        missing_vars+=("TWILIO_ACCOUNT_SID")
    fi
    
    if [ -z "$TWILIO_AUTH_TOKEN" ]; then
        missing_vars+=("TWILIO_AUTH_TOKEN")
    fi
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        echo -e "${GREEN}✓ All required environment variables are set${NC}"
        return 0
    else
        echo -e "${RED}❌ Missing required environment variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "   ${RED}- $var${NC}"
        done
        echo ""
        echo "Please add these to your .env.local file before proceeding."
        return 1
    fi
}

# Main script execution
echo ""
echo -e "${BLUE}📋 Current Environment Status${NC}"

# Load existing environment variables
if [ -f .env.local ]; then
    set -a
    source .env.local
    set +a
    echo -e "${GREEN}✓ Loaded .env.local${NC}"
else
    echo -e "${YELLOW}⚠️  No .env.local file found${NC}"
fi

# Get ngrok URL from user
while true; do
    if get_ngrok_url; then
        # Valid ngrok URL provided
        update_env_var "NEXT_PUBLIC_APP_URL" "$ngrok_url"
        update_env_var "NEXT_PUBLIC_SITE_URL" "$ngrok_url"
        break
    elif [ $? -eq 2 ]; then
        # User skipped ngrok setup
        echo "Using localhost fallback for development"
        break
    else
        # Invalid URL, ask again
        echo "Please try again with a valid ngrok URL."
    fi
done

# Set development-specific variables
echo ""
echo -e "${BLUE}⚙️  Setting Development Configuration${NC}"

# Enable development mode optimizations
update_env_var "NODE_ENV" "development"
update_env_var "MIDDLEWARE_CACHE_ENABLED" "true"
update_env_var "MIDDLEWARE_CACHE_TTL_MS" "30000"
update_env_var "MIDDLEWARE_LOG_ERRORS" "true"

# Set Twilio test mode
update_env_var "TWILIO_TEST_MODE" "true"

echo -e "${GREEN}✓ Development configuration updated${NC}"

# Check required variables
check_required_vars

# Instructions
echo ""
echo -e "${BLUE}📖 Next Steps${NC}"
echo "1. Make sure all required environment variables are set in .env.local"
echo "2. Restart your development server: pnpm run dev"
echo "3. If using ngrok, make sure it's running and pointing to localhost:3000"
echo "4. Test the complete subscription flow with Paddle sandbox"
echo ""
echo -e "${GREEN}🎉 Setup complete! Your environment is now configured for development.${NC}"

# Display current configuration summary
echo ""
echo -e "${BLUE}📊 Configuration Summary${NC}"
echo "========================"
if [ ! -z "$NEXT_PUBLIC_APP_URL" ]; then
    echo -e "App URL: ${GREEN}$NEXT_PUBLIC_APP_URL${NC}"
else
    echo -e "App URL: ${YELLOW}Not set (will use localhost fallback)${NC}"
fi

if [ ! -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "Supabase URL: ${GREEN}✓ Set${NC}"
else
    echo -e "Supabase URL: ${RED}❌ Missing${NC}"
fi

if [ ! -z "$VAPI_PRIVATE_KEY" ]; then
    echo -e "Vapi API Key: ${GREEN}✓ Set${NC}"
else
    echo -e "Vapi API Key: ${RED}❌ Missing${NC}"
fi

if [ ! -z "$TWILIO_ACCOUNT_SID" ]; then
    echo -e "Twilio Config: ${GREEN}✓ Set${NC}"
else
    echo -e "Twilio Config: ${RED}❌ Missing${NC}"
fi

echo ""
echo -e "${BLUE}💡 Pro Tips:${NC}"
echo "• Use 'pnpm run dev' to start the development server"
echo "• Monitor logs for performance metrics and errors"
echo "• Test with Paddle sandbox for safe payment testing"
echo "• Check /debug-auth page if you encounter auth issues" 