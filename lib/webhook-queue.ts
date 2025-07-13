interface QueueItem {
  id: string
  payload: any
  timestamp: number
  retries: number
  maxRetries: number
  processingStartTime?: number
}

interface QueueStats {
  totalProcessed: number
  totalFailed: number
  totalRetries: number
  averageProcessingTime: number
  queueSize: number
  processingCount: number
}

class WebhookQueue {
  private queue: QueueItem[] = []
  private processing: Map<string, QueueItem> = new Map()
  private maxConcurrency: number = 10
  private maxRetries: number = 3
  private retryDelay: number = 1000
  private stats: QueueStats = {
    totalProcessed: 0,
    totalFailed: 0,
    totalRetries: 0,
    averageProcessingTime: 0,
    queueSize: 0,
    processingCount: 0
  }
  private processingTimes: number[] = []

  constructor(options: {
    maxConcurrency?: number
    maxRetries?: number
    retryDelay?: number
  } = {}) {
    this.maxConcurrency = options.maxConcurrency || 10
    this.maxRetries = options.maxRetries || 3
    this.retryDelay = options.retryDelay || 1000
    
    // Start processing loop
    this.startProcessing()
  }

  // Add item to queue
  async enqueue(payload: any): Promise<string> {
    const id = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const item: QueueItem = {
      id,
      payload,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.maxRetries
    }
    
    this.queue.push(item)
    this.stats.queueSize = this.queue.length
    
    console.log(`📥 Webhook queued: ${id} (queue size: ${this.queue.length})`)
    
    return id
  }

  // Process queue items
  private async startProcessing() {
    setInterval(async () => {
      await this.processQueue()
    }, 100) // Check every 100ms
  }

  private async processQueue() {
    // Don't exceed max concurrency
    if (this.processing.size >= this.maxConcurrency) {
      return
    }

    // Get next item from queue
    const item = this.queue.shift()
    if (!item) {
      return
    }

    this.stats.queueSize = this.queue.length
    this.stats.processingCount = this.processing.size + 1

    // Start processing
    this.processing.set(item.id, item)
    item.processingStartTime = Date.now()

    try {
      console.log(`🔄 Processing webhook: ${item.id} (attempt ${item.retries + 1})`)
      
      // Process the webhook
      await this.processWebhook(item.payload)
      
      // Success
      const processingTime = Date.now() - item.processingStartTime!
      this.processingTimes.push(processingTime)
      
      // Keep only last 100 processing times for average calculation
      if (this.processingTimes.length > 100) {
        this.processingTimes = this.processingTimes.slice(-100)
      }
      
      this.stats.totalProcessed++
      this.stats.averageProcessingTime = this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length
      
      console.log(`✅ Webhook processed successfully: ${item.id} (${processingTime}ms)`)
      
    } catch (error) {
      console.error(`❌ Webhook processing failed: ${item.id}`, error)
      
      // Retry logic
      if (item.retries < item.maxRetries) {
        item.retries++
        this.stats.totalRetries++
        
        console.log(`🔄 Retrying webhook: ${item.id} (attempt ${item.retries + 1}/${item.maxRetries})`)
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.unshift(item) // Add to front for priority
          this.stats.queueSize = this.queue.length
        }, this.retryDelay * item.retries) // Exponential backoff
        
      } else {
        this.stats.totalFailed++
        console.error(`💀 Webhook failed permanently: ${item.id}`)
      }
    } finally {
      this.processing.delete(item.id)
      this.stats.processingCount = this.processing.size
    }
  }

  // Process individual webhook (to be implemented by the caller)
  private async processWebhook(payload: any): Promise<void> {
    // This will be overridden by the webhook handler
    throw new Error('processWebhook method must be implemented')
  }

  // Set the webhook processor function
  setProcessor(processor: (payload: any) => Promise<void>) {
    this.processWebhook = processor
  }

  // Get queue statistics
  getStats(): QueueStats {
    return { ...this.stats }
  }

  // Get queue status
  getStatus() {
    return {
      queueSize: this.queue.length,
      processingCount: this.processing.size,
      maxConcurrency: this.maxConcurrency,
      canProcess: this.processing.size < this.maxConcurrency
    }
  }

  // Clear queue (for testing)
  clear() {
    this.queue = []
    this.processing.clear()
    this.stats = {
      totalProcessed: 0,
      totalFailed: 0,
      totalRetries: 0,
      averageProcessingTime: 0,
      queueSize: 0,
      processingCount: 0
    }
    this.processingTimes = []
  }
}

// Singleton instance
const webhookQueue = new WebhookQueue({
  maxConcurrency: 5, // Process max 5 webhooks concurrently
  maxRetries: 2,
  retryDelay: 1000
})

export { webhookQueue, WebhookQueue }
export type { QueueStats } 