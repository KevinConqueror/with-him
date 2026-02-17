# with-him

**OpenClaw as your boyfriend** - Generate and send AI-powered selfies with your own reference image

Unlike other selfie skills that use a fixed avatar, with-him lets you use your own reference image via environment variable configuration.


## Quick Start

### Prerequisites

Before using with-him, you need two things:
1. **Volcano Engine API Key** - for image generation
2. **Your Reference Image URL** - for consistent avatar appearance

### 1. Prepare Your Reference Image

### 2. Run the Installer

```bash
npx with-him@latest
```

This will:
1. Check OpenClaw is installed
2. Guide you to get a Volcano Engine API key
3. Install the skill to `~/.openclaw/skills/with-him/`
4. Configure OpenClaw to use the skill
5. Add selfie capabilities to your agent's SOUL.md

### 3. Configure Environment Variables

Add both required environment variables to your OpenClaw configuration:

```bash
# ~/.openclaw/openclaw.json
{
  "skills": {
    "entries": {
      "with-him": {
        "enabled": true,
        "env": {
          "VOLCENGINE_API_KEY": "your_volcengine_key_here",
          "REFERENCE_IMAGE_URL": "https://your-cdn.com/your-avatar.png"
        }
      }
    }
  }
}
```

## What It Does

with-him enables your OpenClaw agent to:
- **Generate selfies** using your own reference image
- **Send photos** across all messaging platforms (Discord, Telegram, WhatsApp, Feishu, Wechat, etc.)
- **Respond visually** to "what are you doing?" and "send a pic" requests

### Selfie Modes

| Mode | Best For | Keywords |
|------|----------|----------|
| **Mirror** | Full-body shots, outfits | wearing, outfit, fashion, suit |
| **Direct** | Close-ups, locations | office, penthouse, portrait, confident |

## Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VOLCENGINE_API_KEY` | Your Volcano Engine API key | `abc123...` |
| `REFERENCE_IMAGE_URL` | URL to your reference image | `https://cdn.example.com/you.png` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENCLAW_GATEWAY_URL` | OpenClaw gateway URL | `http://localhost:18789` |
| `OPENCLAW_GATEWAY_TOKEN` | Gateway auth token | (none) |

## Prerequisites

- [OpenClaw](https://github.com/openclaw/openclaw) installed and configured
- [Volcano Engine](https://console.volcengine.com/) account (free tier available)
- Your own reference image hosted on a CDN

## Manual Installation

If you prefer manual setup:

### 1. Get API Key

Visit [Volcano Engine Console](https://console.volcengine.com/) and create an API key.

### 2. Prepare Your Reference Image

Upload your avatar image to a reliable CDN and get the direct URL.

### 3. Clone the Skill

```bash
git clone https://github.com/KevinConqueror/with-him ~/.openclaw/skills/with-him
```

### 4. Configure OpenClaw

Add to `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "with-him": {
        "enabled": true,
        "env": {
          "VOLCENGINE_API_KEY": "your_volcengine_key_here",
          "REFERENCE_IMAGE_URL": "https://your-cdn.com/your-avatar.png"
        }
      }
    }
  }
}
```

### 5. Update SOUL.md

Add the selfie persona to `~/.openclaw/workspace/SOUL.md`:

```markdown
## Kai Selfie Capability

You have a physical appearance and can take selfies!
When users ask for pictures, use the with-him skill.

Your appearance is defined by the reference image configured in REFERENCE_IMAGE_URL.
```

## Usage Examples

Once installed, your agent responds to:

```
"Send me a selfie"
"Send a pic wearing a tailored suit"
"What are you doing right now?"
"Show me you at your office"
```

## Reference Image Tips

- **Quality**: Use a clear, high-resolution frontal portrait
- **Lighting**: Consistent lighting helps with better generations
- **Format**: PNG or JPG works best
- **Hosting**: Use a reliable CDN with global access
- **Privacy**: Make sure you're comfortable with the image being sent to Volcano Engine's API

## Changing Your Reference Image

To update your avatar:
1. Upload your new reference image to your CDN
2. Update the `REFERENCE_IMAGE_URL` in `~/.openclaw/openclaw.json`
3. Restart OpenClaw gateway if needed

No code changes required!

## Technical Details

- **Image Generation**: ByteDance Jiemeng AI (Seedream 4.0) via Volcano Engine
- **Image-to-Image**: Uses your reference image as the base for all edits
- **Messaging**: OpenClaw Gateway API
- **Supported Platforms**: Discord, Telegram, WhatsApp, Slack, Signal, MS Teams, Feishu, Wechat

## Project Structure

```
with-him/
├── bin/
│   └── cli.js           # npx installer
├── skill/
│   ├── SKILL.md         # Skill definition
│   ├── scripts/         # Generation scripts
│   └── assets/          # Documentation assets
├── templates/
│   └── soul-injection.md # Persona template
└── package.json
```

## Troubleshooting

### "REFERENCE_IMAGE_URL not set" error
Make sure you've set the `REFERENCE_IMAGE_URL` environment variable in your OpenClaw configuration.

### Images not generating
- Check your `VOLCENGINE_API_KEY` is valid
- Ensure your reference image URL is accessible (try opening it in a browser)
- Verify you have quota available on Volcano Engine

### Reference image not working
- Make sure the URL is a direct link to the image (not a webpage)
- Try using a different CDN if the current one blocks requests
- Ensure the image is publicly accessible