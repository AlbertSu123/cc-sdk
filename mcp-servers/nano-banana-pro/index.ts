import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GoogleGenAI } from "@google/genai";
import * as z from "zod";
import { readFileSync, writeFileSync } from "fs";

const server = new McpServer({
  name: "nano-banana-pro",
  version: "1.0.0",
});

server.registerTool(
  "generate_image",
  {
    title: "Generate Image",
    description: "Generate an image using Nano Banana Pro (Gemini 3 Pro Image)",
    inputSchema: {
      prompt: z.string().describe("Text prompt describing the image to generate"),
      outputPath: z.string().optional().describe("File path to save the generated image (e.g. /path/to/image.png)"),
      images: z.array(z.string()).optional().describe("Optional array of image paths (local files or URLs) for image editing"),
      aspectRatio: z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "21:9"]).default("1:1").describe("Aspect ratio"),
      imageSize: z.enum(["1K", "2K", "4K"]).default("2K").describe("Image resolution"),
      model: z.literal("gemini-3-pro-image-preview").default("gemini-3-pro-image-preview").describe("Model to use"),
    },
  },
  async ({ prompt, outputPath, images, aspectRatio, imageSize, model }) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_API_KEY not set");

    console.log(`[nano-banana-pro] Generating image with ${model}...`);
    console.log(`[nano-banana-pro] Prompt: ${prompt}`);
    console.log(`[nano-banana-pro] Aspect ratio: ${aspectRatio}, Size: ${imageSize}`);

    const ai = new GoogleGenAI({ apiKey });

    // Build contents - can be string or array with images
    let contents: any = prompt;

    // Add images if provided
    if (images && images.length > 0) {
      console.log(`[nano-banana-pro] Adding ${images.length} input image(s)`);
      const parts: any[] = [{ text: prompt }];

      for (const imagePath of images) {
        if (imagePath.startsWith("http")) {
          // Fetch remote image
          const res = await fetch(imagePath);
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const mimeType = res.headers.get("content-type") || "image/png";
          parts.push({ inlineData: { mimeType, data: base64 } });
        } else {
          // Read local file
          const data = readFileSync(imagePath);
          const base64 = data.toString("base64");
          const ext = imagePath.split(".").pop()?.toLowerCase();
          const mimeType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/png";
          parts.push({ inlineData: { mimeType, data: base64 } });
        }
      }
      contents = parts;
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error("No response parts");
    }

    const results: any[] = [];
    for (const part of parts) {
      if (part.text) {
        console.log(`[nano-banana-pro] Text response: ${part.text}`);
        results.push({ type: "text", text: part.text });
      } else if (part.inlineData) {
        console.log(`[nano-banana-pro] Image generated (${part.inlineData.mimeType})`);

        // Save to file if outputPath provided
        if (outputPath) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          writeFileSync(outputPath, buffer);
          console.log(`[nano-banana-pro] Image saved to ${outputPath}`);
          results.push({ type: "text", text: `Image saved to ${outputPath}` });
        } else {
          results.push({
            type: "image",
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          });
        }
      }
    }

    if (results.length === 0) {
      throw new Error("No content in response");
    }

    return { content: results };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("[nano-banana-pro] MCP server started");
