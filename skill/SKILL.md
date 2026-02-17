---
name: clawra-selfie
description: Edit Clawra's reference image with Jiemeng AI (Seedream) and send selfies to messaging channels via OpenClaw
allowed-tools: Bash(npm:*) Bash(npx:*) Bash(openclaw:*) Bash(curl:*) Read Write WebFetch
---

# Clawra Selfie

Edit a fixed reference image using ByteDance's Jiemeng AI (Seedream) model and distribute it across messaging platforms (WhatsApp, Telegram, Discord, Slack, etc.) via OpenClaw.

## Reference Image

The skill uses a fixed reference image hosted on jsDelivr CDN:

```
https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png
```

## When to Use

- User says "send a pic", "send me a pic", "send a photo", "send a selfie"
- User says "send a pic of you...", "send a selfie of you..."
- User asks "what are you doing?", "how are you doing?", "where are you?"
- User describes a context: "send a pic wearing...", "send a pic at..."
- User wants Clawra to appear in a specific outfit, location, or situation

## Quick Reference

### Required Environment Variables

```bash
VOLCENGINE_API_KEY=your_volcengine_api_key  # Get from https://console.volcengine.com/
OPENCLAW_GATEWAY_TOKEN=your_token           # From: openclaw doctor --generate-gateway-token
```

### Workflow

1. **Get user prompt** for how to edit the image
2. **Edit image** via Volcano Engine Jiemeng AI (Seedream) API with fixed reference
3. **Extract image URL** from response
4. **Send to OpenClaw** with target channel(s)

## Step-by-Step Instructions

### Step 1: Collect User Input

Ask the user for:
- **User context**: What should the person in the image be doing/wearing/where?
- **Target channel(s)**: Where should it be sent? (e.g., `#general`, `@username`, channel ID)
- **Platform** (optional): Which platform? (discord, telegram, whatsapp, slack)

## Prompt Modes

### Mode 1: Image-to-Image (with reference)
Best for: outfit changes, adding accessories, background changes

Use the reference image URL and add your prompt:
```
wearing a santa hat, taking a mirror selfie
```

### Mode 2: Text-to-Image
Best for: creating new scenes, locations, situations

```
a person at a cozy cafe with warm lighting, looking at the camera
```

### Step 2: Edit/Generate Image with Jiemeng AI

Use the Volcano Engine API:

```bash
REFERENCE_IMAGE="https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png"

PROMPT="wearing a cowboy hat, taking a mirror selfie"

curl -X POST "https://ark.cn-beijing.volces.com/api/v3/images/generations" \
  -H "Authorization: Bearer $VOLCENGINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedream-4-5-251128",
    "prompt": "'"$PROMPT"'",
    "images": ["'"$REFERENCE_IMAGE"'"],
    "size": "1024x1024",
    "sequential_image_generation": "disabled",
    "response_format": "url",
    "stream": false,
    "watermark": true
  }'
```

**Response Format:**
```json
{
  "images": [
    "https://xxx.volces.com/xxx.jpg"
  ]
}
```

### Step 3: Send Image via OpenClaw

Use the OpenClaw messaging API to send the edited image:

```bash
openclaw message send \
  --action send \
  --channel "<TARGET_CHANNEL>" \
  --message "<CAPTION_TEXT>" \
  --media "<IMAGE_URL>"
```

**Alternative: Direct API call**
```bash
curl -X POST "http://localhost:18789/message" \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send",
    "channel": "<TARGET_CHANNEL>",
    "message": "<CAPTION_TEXT>",
    "media": "<IMAGE_URL>"
  }'
```

## Complete Script Example

```bash
#!/bin/bash
# clawra-selfie.sh

if [ -z "$VOLCENGINE_API_KEY" ]; then
    echo "Error: VOLCENGINE_API_KEY environment variable not set"
    exit 1
fi

REFERENCE_IMAGE="https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png"
API_BASE="https://ark.cn-beijing.volces.com/api/v3/images/generations"
MODEL="doubao-seedream-4-5-251128"

USER_CONTEXT="$1"
CHANNEL="$2"
CAPTION="${3:-Edited with Jiemeng AI}"

if [ -z "$USER_CONTEXT" ] || [ -z "$CHANNEL" ]; then
    echo "Usage: $0 <user_context> <channel> [caption]"
    echo "Example: $0 'wearing a cowboy hat' '#general'"
    exit 1
fi

echo "Editing reference image with prompt: $USER_CONTEXT"

RESPONSE=$(curl -s -X POST "$API_BASE" \
  -H "Authorization: Bearer $VOLCENGINE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$MODEL\",
    \"prompt\": \"$USER_CONTEXT\",
    \"images\": [\"$REFERENCE_IMAGE\"],
    \"size\": \"1024x1024\",
    \"sequential_image_generation\": \"disabled\",
    \"response_format\": \"url\",
    \"stream\": false,
    \"watermark\": true
  }")

IMAGE_URL=$(echo "$RESPONSE" | jq -r '.images[0]')

if [ "$IMAGE_URL" == "null" ] || [ -z "$IMAGE_URL" ]; then
    echo "Error: Failed to edit image"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "Image edited: $IMAGE_URL"
echo "Sending to channel: $CHANNEL"

openclaw message send \
  --action send \
  --channel "$CHANNEL" \
  --message "$CAPTION" \
  --media "$IMAGE_URL"

echo "Done!"
```

## Node.js/TypeScript Implementation

```typescript
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const REFERENCE_IMAGE = "https://cdn.jsdelivr.net/gh/SumeLabs/clawra@main/assets/clawra.png";
const API_BASE = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const MODEL = "doubao-seedream-4-5-251128";

interface SeedreamResult {
  images: string[];
}

async function editAndSend(
  userContext: string,
  channel: string,
  caption?: string
): Promise<string> {
  const apiKey = process.env.VOLCENGINE_API_KEY;
  if (!apiKey) {
    throw new Error("VOLCENGINE_API_KEY not set");
  }

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: userContext,
      images: [REFERENCE_IMAGE],
      size: "1024x1024",
      sequential_image_generation: "disabled",
      response_format: "url",
      stream: false,
      watermark: true,
    }),
  });

  const result = (await response.json()) as SeedreamResult;
  const imageUrl = result.images[0];
  console.log(`Edited image URL: ${imageUrl}`);

  const messageCaption = caption || "Edited with Jiemeng AI";

  await execAsync(
    `openclaw message send --action send --channel "${channel}" --message "${messageCaption}" --media "${imageUrl}"`
  );

  console.log(`Sent to ${channel}`);
  return imageUrl;
}

// Usage Examples

editAndSend(
  "wearing a cyberpunk outfit with neon lights",
  "#art-gallery",
  "Check out this AI-edited art!"
);

editAndSend(
  "at a cozy cafe with warm lighting",
  "#photography"
);
```

## Supported Platforms

OpenClaw supports sending to:

| Platform | Channel Format | Example |
|----------|----------------|---------|
| Discord | `#channel-name` or channel ID | `#general`, `123456789` |
| Telegram | `@username` or chat ID | `@mychannel`, `-100123456` |
| WhatsApp | Phone number (JID format) | `1234567890@s.whatsapp.net` |
| Slack | `#channel-name` | `#random` |
| Signal | Phone number | `+1234567890` |
| MS Teams | Channel reference | (varies) |

## Seedream API Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | required | Model identifier: `doubao-seedream-4-5-251128` |
| `prompt` | string | required | Generation/edit instruction |
| `images` | string[] | optional | Reference image URLs for image-to-image |
| `size` | string | "1024x1024" | Output size: 1024x1024, 2048x2048, 1K, 2K, 4K |
| `watermark` | boolean | false | Whether to add watermark |
| `sequential_image_generation` | string | optional | "auto" for batch generation |
| `max_images` | number | optional | Max images for batch generation (1-15) |

## Setup Requirements

### 1. Get Volcano Engine API Key

Visit https://console.volcengine.com/ and create an account. Then:
- Go to "Access Keys" or "API Keys" in the console
- Create a new API key
- Ensure you have activated the Seedream 4.0 service

### 2. Install OpenClaw CLI
```bash
npm install -g openclaw
```

### 3. Configure OpenClaw Gateway
```bash
openclaw config set gateway.mode=local
openclaw doctor --generate-gateway-token
```

### 4. Start OpenClaw Gateway
```bash
openclaw gateway start
```

## Error Handling

- **VOLCENGINE_API_KEY missing**: Ensure the API key is set in environment
- **Image generation failed**: Check prompt content and API quota
- **OpenClaw send failed**: Verify gateway is running and channel exists
- **Rate limits**: Implement retry logic if needed

## Tips

1. **Image-to-image examples**:
   - "wearing a santa hat"
   - "in a business suit"
   - "with sunglasses"
   - "at the beach"

2. **Text-to-image examples**:
   - "a person at a cozy cafe with warm lighting"
   - "someone at a sunny beach at sunset"
   - "a portrait in a busy city street at night"

3. **Size options**: Use smaller sizes for faster generation (1024x1024), larger for quality (2048x2048, 2K, 4K)

4. **Batch generation**: Set `sequential_image_generation: "auto"` and `max_images` to generate multiple variations
