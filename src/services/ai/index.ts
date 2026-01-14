export { getAIService, resetAIService, AIService } from './AIService';
export type { 
  IAIService, 
  IAIProvider, 
  DepthResult, 
  AIProgressCallback,
  AICacheConfig,
  ImageAnalysis
} from './types';

// Note: Individual providers are internal implementation details
// Use getAIService() to access AI functionality
