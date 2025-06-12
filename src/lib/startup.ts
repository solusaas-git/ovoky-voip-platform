import { SchedulerService } from '@/services/SchedulerService';

let isInitialized = false;

/**
 * Initialize application services
 * This should be called once when the application starts
 */
export async function initializeApp(): Promise<void> {
  if (isInitialized) {
    console.log('Application already initialized');
    return;
  }

  console.log('🚀 Initializing application...');
  
  try {
    // Initialize the scheduler service
    const scheduler = SchedulerService.getInstance();
    await scheduler.initialize();
    
    // Mark as initialized
    isInitialized = true;
    
    console.log('✅ Application initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing application:', error);
    // Don't throw error to prevent app from crashing
  }
}

/**
 * Get initialization status
 */
export function isAppInitialized(): boolean {
  return isInitialized;
} 