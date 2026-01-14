import { createLogger } from "@/core/Logger";

import type { IAIProvider, DepthResult } from "../types";
import type { AnalysisResult, SceneType, TechPipeline } from "@/shared/types";

// Use AnalysisResult as ImageAnalysis for this file
type ImageAnalysis = AnalysisResult;

const logger = createLogger({ module: "GeminiProvider" });

const ANALYSIS_PROMPT = `Analyze this image and provide a JSON response with the following structure:
{
  "sceneType": "INDOOR" | "OUTDOOR" | "OBJECT" | "UNKNOWN",
  "description": "Brief description of the scene",
  "reasoning": "Why you chose this scene type",
  "estimatedDepthScale": number between 0.5 and 5,
  "recommendedFov": number between 30 and 90,
  "recommendedPipeline": "DEPTH_MESH" | "GAUSSIAN_SPLAT" | "GENERATIVE_MESH",
  "suggestedModel": "default" | "portrait" | "landscape"
}

Consider:
- Scene depth and complexity
- Whether it's a close-up object or wide scene
- Lighting conditions
- Best projection mode for 3D effect`;

// @google/genai SDK types
interface GenerateContentResponse {
  text: string;
}

interface GoogleGenAIModels {
  generateContent(params: {
    model: string;
    contents: { inlineData?: { mimeType: string; data: string }; text?: string }[];
  }): Promise<GenerateContentResponse>;
}

interface GoogleGenAIClient {
  models: GoogleGenAIModels;
}

export class GeminiProvider implements IAIProvider {
  readonly providerId = "gemini";
  private _isAvailable = false;
  private client: GoogleGenAIClient | null = null;

  get isAvailable(): boolean {
    return this._isAvailable;
  }

  async initialize(): Promise<void> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    if (!apiKey) {
      logger.warn("Gemini API Key 未配置");
      this._isAvailable = false;
      return;
    }

    try {
      // Dynamic import to avoid bundling issues when package is not installed
      // Using variable to bypass TypeScript static analysis
      const moduleName = "@google/genai";
      const module = await import(/* @vite-ignore */ moduleName).catch(
        () => null
      );
      if (!module) {
        logger.warn("Gemini SDK not installed");
        this._isAvailable = false;
        return;
      }

      const { GoogleGenAI } = module;
      this.client = new GoogleGenAI({ apiKey }) as GoogleGenAIClient;
      this._isAvailable = true;
      logger.info("GeminiProvider initialized");
    } catch (error) {
      logger.error("Failed to initialize Gemini", { error: String(error) });
      this._isAvailable = false;
    }
  }

  async dispose(): Promise<void> {
    this.client = null;
    this._isAvailable = false;
    logger.info("GeminiProvider destroyed");
  }

  async analyzeScene(base64Image: string): Promise<ImageAnalysis> {
    if (!this.client) {
      throw new Error("Gemini client not initialized");
    }

    try {
      // Extract base64 data if it includes the data URL prefix
      const base64Data = base64Image.includes(",")
        ? base64Image.split(",")[1]!
        : base64Image;

      const result = await this.client.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          { text: ANALYSIS_PROMPT },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
        ],
      });

      let text = result.text;

      if (!text) {
        throw new Error("Gemini 未返回任何响应");
      }

      text = text.replace(/```json\s*|\s*```/g, "").trim();

      const parsed = JSON.parse(text) as {
        sceneType: string;
        description: string;
        reasoning: string;
        estimatedDepthScale: number;
        recommendedFov: number;
        recommendedPipeline: string;
        suggestedModel: string;
      };

      return {
        sceneType: parsed.sceneType as SceneType,
        description: parsed.description,
        reasoning: parsed.reasoning,
        estimatedDepthScale: parsed.estimatedDepthScale,
        recommendedFov: parsed.recommendedFov,
        recommendedPipeline: parsed.recommendedPipeline as TechPipeline,
        suggestedModel: parsed.suggestedModel,
      };
    } catch (error) {
      logger.error("Gemini analysis failed", { error: String(error) });
      throw error;
    }
  }

  async estimateDepth(_imageUrl: string): Promise<DepthResult> {
    // Gemini doesn't support depth estimation directly
    throw new Error("Gemini does not support depth estimation");
  }
}

export const createGeminiProvider = (): IAIProvider => new GeminiProvider();
