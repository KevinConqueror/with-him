#!/bin/bash
# clawra-selfie.sh
# Generate an image with Jiemeng AI (Seedream) and send it via OpenClaw
#
# Usage: ./clawra-selfie.sh "<prompt>" "<channel>" ["<caption>"] ["<size>"] ["<reference_image>"]
#
# Environment variables required:
#   VOLCENGINE_API_KEY - Your Volcano Engine API key
#
# Example:
#   VOLCENGINE_API_KEY=your_key ./clawra-selfie.sh "A sunset over mountains" "#art" "Check this out!"
#   VOLCENGINE_API_KEY=your_key ./clawra-selfie.sh "wearing a cowboy hat" "#general" "Mirror selfie" "1024x1024" "https://example.com/ref.png"

set -euo pipefail

VOLCENGINE_API_BASE="https://ark.cn-beijing.volces.com/api/v3/seedream-4-0"
SEEDREAM_MODEL="doubao-seedream-4-0-250828"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

if [ -z "${VOLCENGINE_API_KEY:-}" ]; then
    log_error "VOLCENGINE_API_KEY environment variable not set"
    echo "Get your API key from: https://console.volcengine.com/"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed"
    echo "Install with: brew install jq (macOS) or apt install jq (Linux)"
    exit 1
fi

if ! command -v openclaw &> /dev/null; then
    log_warn "openclaw CLI not found - will attempt direct API call"
    USE_CLI=false
else
    USE_CLI=true
fi

PROMPT="${1:-}"
CHANNEL="${2:-}"
CAPTION="${3:-Generated with Jiemeng AI}"
SIZE="${4:-1024x1024}"
REFERENCE_IMAGE="${5:-}"

if [ -z "$PROMPT" ] || [ -z "$CHANNEL" ]; then
    echo "Usage: $0 <prompt> <channel> [caption] [size] [reference_image]"
    echo ""
    echo "Arguments:"
    echo "  prompt          - Image description (required)"
    echo "  channel        - Target channel (required) e.g., #general, @user"
    echo "  caption        - Message caption (default: 'Generated with Jiemeng AI')"
    echo "  size           - Image size (default: 1024x1024) Options: 1024x1024, 2048x2048, 1K, 2K, 4K"
    echo "  reference_image - Reference image URL for image-to-image (optional)"
    echo ""
    echo "Example:"
    echo "  $0 \"A cyberpunk city at night\" \"#art-gallery\" \"AI Art!\""
    echo "  $0 \"wearing a cowboy hat\" \"#general\" \"Mirror selfie\" \"1024x1024\" \"https://example.com/ref.png\""
    exit 1
fi

log_info "Generating image with Jiemeng AI (Seedream)..."
log_info "Prompt: $PROMPT"
log_info "Size: $SIZE"
if [ -n "$REFERENCE_IMAGE" ]; then
    log_info "Reference image: $REFERENCE_IMAGE"
fi

BUILD_JSON() {
    local json="{\"model\": \"$SEEDREAM_MODEL\", \"prompt\": $(echo "$PROMPT" | jq -Rs .), \"size\": \"$SIZE\", \"watermark\": false}"
    
    if [ -n "$REFERENCE_IMAGE" ]; then
        json=$(echo "$json" | jq --arg img "$REFERENCE_IMAGE" '. + {images: [$img]}')
    fi
    
    echo "$json"
}

RESPONSE=$(curl -s -X POST "$VOLCENGINE_API_BASE" \
    -H "Authorization: Bearer $VOLCENGINE_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(BUILD_JSON)")

if echo "$RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error // .detail // "Unknown error"')
    log_error "Image generation failed: $ERROR_MSG"
    exit 1
fi

IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0] // empty')

if [ -z "$IMAGE_URL" ] || [ "$IMAGE_URL" = "null" ]; then
    log_error "Failed to extract image URL from response"
    echo "Response: $RESPONSE"
    exit 1
fi

log_info "Image generated successfully!"
log_info "URL: $IMAGE_URL"

log_info "Sending to channel: $CHANNEL"

if [ "$USE_CLI" = true ]; then
    openclaw message send \
        --action send \
        --channel "$CHANNEL" \
        --message "$CAPTION" \
        --media "$IMAGE_URL"
else
    GATEWAY_URL="${OPENCLAW_GATEWAY_URL:-http://localhost:18789}"
    GATEWAY_TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"

    curl -s -X POST "$GATEWAY_URL/message" \
        -H "Content-Type: application/json" \
        ${GATEWAY_TOKEN:+-H "Authorization: Bearer $GATEWAY_TOKEN"} \
        -d "{
            \"action\": \"send\",
            \"channel\": \"$CHANNEL\",
            \"message\": \"$CAPTION\",
            \"media\": \"$IMAGE_URL\"
        }"
fi

log_info "Done! Image sent to $CHANNEL"

echo ""
echo "--- Result ---"
jq -n \
    --arg url "$IMAGE_URL" \
    --arg channel "$CHANNEL" \
    --arg prompt "$PROMPT" \
    '{
        success: true,
        image_url: $url,
        channel: $channel,
        prompt: $prompt
    }'
