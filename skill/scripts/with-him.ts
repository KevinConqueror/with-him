/**
 * Seedream (Jiemeng AI) to OpenClaw Integration
 *
 * Generates images using ByteDance's Seedream model via Volcano Engine
 * and sends them to messaging channels via OpenClaw.
 *
 * Usage:
 *   npx ts-node with-him.ts "<prompt>" "<channel>" ["<caption>"]
 *
 * Environment variables:
 *   VOLCENGINE_API_KEY - Your Volcano Engine API key (required)
 *   REFERENCE_IMAGE_URL - URL to your reference image (required)
 *   OPENCLAW_GATEWAY_URL - OpenClaw gateway URL (default: http://localhost:18789)
 *   OPENCLAW_GATEWAY_TOKEN - Gateway auth token (optional)
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const VOLCENGINE_API_BASE = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
const SEEDREAM_MODEL = "doubao-seedream-4-5-251128";

interface SeedreamInput {
  prompt: string;
  image?: string[];
  size?: string;
  sequential_image_generation?: string;
  response_format?: string;
  stream?: boolean;
  max_images?: number;
  watermark?: boolean;
}

interface SeedreamImageResult {
  data: Array<{
    url: string;
    size?: string;
  }>;
}

interface OpenClawMessage {
  action: "send";
  channel: string;
  message: string;
  media?: string;
}

interface GenerateAndSendOptions {
  prompt: string;
  channel: string;
  caption?: string;
  referenceImage?: string;
  size?: string;
  useClaudeCodeCLI?: boolean;
}

interface Result {
  success: boolean;
  imageUrl: string;
  channel: string;
  prompt: string;
}

async function generateImage(
  input: SeedreamInput
): Promise<SeedreamImageResult> {
  const apiKey = process.env.VOLCENGINE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "VOLCENGINE_API_KEY environment variable not set. Get your key from https://console.volcengine.com/"
    );
  }

  const requestBody: Record<string, unknown> = {
    model: SEEDREAM_MODEL,
    prompt: input.prompt,
  };

  if (input.image && input.image.length > 0) {
    requestBody.images = input.image;
  }

  if (input.size) {
    requestBody.size = input.size;
  } else {
    requestBody.size = "1024x1024";
  }

  if (input.sequential_image_generation) {
    requestBody.sequential_image_generation = input.sequential_image_generation;
  }

  if (input.max_images) {
    requestBody.max_images = input.max_images;
  }

  // Set default values for new parameters
  requestBody.sequential_image_generation = input.sequential_image_generation || "disabled";
  requestBody.response_format = input.response_format || "url";
  requestBody.stream = input.stream !== undefined ? input.stream : false;

  if (input.watermark !== undefined) {
    requestBody.watermark = input.watermark;
  } else {
    requestBody.watermark = true;
  }

  const response = await fetch(VOLCENGINE_API_BASE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image generation failed: ${response.status} ${error}`);
  }

  const result = await response.json() as SeedreamImageResult;
  return result;
}

async function sendViaOpenClaw(
  message: OpenClawMessage,
  useCLI: boolean = true
): Promise<void> {
  if (useCLI) {
    const cmd = `openclaw message send --action send --channel "${message.channel}" --message "${message.message}" --media "${message.media}"`;
    await execAsync(cmd);
    return;
  }

  const gatewayUrl =
    process.env.OPENCLAW_GATEWAY_URL || "http://localhost:18789";
  const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (gatewayToken) {
    headers["Authorization"] = `Bearer ${gatewayToken}`;
  }

  const response = await fetch(`${gatewayUrl}/message`, {
    method: "POST",
    headers,
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenClaw send failed: ${error}`);
  }
}

async function generateAndSend(options: GenerateAndSendOptions): Promise<Result> {
  const {
    prompt,
    channel,
    caption = "Generated with Jiemeng AI (Seedream)",
    referenceImage,
    size = "1024x1024",
    useClaudeCodeCLI = true,
  } = options;

  console.log(`[INFO] Generating image with Jiemeng AI (Seedream)...`);
  console.log(`[INFO] Prompt: ${prompt}`);
  console.log(`[INFO] Size: ${size}`);
  if (referenceImage) {
    console.log(`[INFO] Reference image: ${referenceImage}`);
  }

  const imageResult = await generateImage({
    prompt,
    image: referenceImage ? [referenceImage] : undefined,
    size,
    watermark: false,
  });

  const imageUrl = imageResult.data[0].url;
  console.log(`[INFO] Image generated: ${imageUrl}`);

  console.log(`[INFO] Sending to channel: ${channel}`);

  await sendViaOpenClaw(
    {
      action: "send",
      channel,
      message: caption,
      media: imageUrl,
    },
    useClaudeCodeCLI
  );

  console.log(`[INFO] Done! Image sent to ${channel}`);

  return {
    success: true,
    imageUrl,
    channel,
    prompt,
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Usage: npx ts-node with-him.ts <prompt> <channel> [caption] [size] [reference_image]

Arguments:
  prompt          - Image description (required)
  channel         - Target channel (required) e.g., #general, @user
  caption         - Message caption (default: 'Generated with Jiemeng AI')
  size            - Image size (default: 1024x1024) Options: 1024x1024, 2048x2048, 1K, 2K, 4K
  reference_image - Reference image URL (optional, overrides REFERENCE_IMAGE_URL env var)

Environment Variables (required):
  VOLCENGINE_API_KEY    - Your Volcano Engine API key
  REFERENCE_IMAGE_URL   - URL to your reference image for consistent appearance

Optional Environment:
  OPENCLAW_GATEWAY_URL  - OpenClaw gateway URL (default: http://localhost:18789)
  OPENCLAW_GATEWAY_TOKEN - Gateway auth token

Examples:
  # Using environment variable for reference image
  VOLCENGINE_API_KEY=your_key REFERENCE_IMAGE_URL=https://example.com/you.png npx ts-node with-him.ts "wearing a suit" "#general"
  
  # Using command line argument for reference image
  VOLCENGINE_API_KEY=your_key npx ts-node with-him.ts "wearing a suit" "#general" "Executive look" "1024x1024" "https://example.com/you.png"
`);
    process.exit(1);
  }

  const [prompt, channel, caption, size, referenceImageArg] = args;
  
  // Use command line argument if provided, otherwise fall back to environment variable
  const referenceImage = referenceImageArg || process.env.REFERENCE_IMAGE_URL;
  
  if (!referenceImage) {
    console.error("[ERROR] REFERENCE_IMAGE_URL environment variable or reference_image argument is required");
    console.error("Please provide a reference image URL via:");
    console.error("  1. REFERENCE_IMAGE_URL environment variable, or");
    console.error("  2. Command line argument (5th argument)");
    process.exit(1);
  }

  try {
    const result = await generateAndSend({
      prompt,
      channel,
      caption,
      size,
      referenceImage,
    });

    console.log("\n--- Result ---");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(`[ERROR] ${(error as Error).message}`);
    process.exit(1);
  }
}

export {
  generateImage,
  sendViaOpenClaw,
  generateAndSend,
  SeedreamInput,
  SeedreamImageResult,
  OpenClawMessage,
  GenerateAndSendOptions,
  Result,
};

if (require.main === module) {
  main();
}
