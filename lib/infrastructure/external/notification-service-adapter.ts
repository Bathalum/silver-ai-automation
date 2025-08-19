import { Result } from '../../domain/shared/result';

/**
 * Interface for notification service operations
 */
export interface INotificationServiceAdapter {
  /**
   * Send email notification
   */
  sendEmail(config: EmailNotificationConfig): Promise<Result<NotificationResult>>;

  /**
   * Send push notification
   */
  sendPushNotification(config: PushNotificationConfig): Promise<Result<NotificationResult>>;

  /**
   * Send SMS notification
   */
  sendSMS(config: SMSNotificationConfig): Promise<Result<NotificationResult>>;

  /**
   * Send Slack notification
   */
  sendSlackNotification(config: SlackNotificationConfig): Promise<Result<NotificationResult>>;

  /**
   * Get notification templates
   */
  getTemplates(): Promise<Result<NotificationTemplate[]>>;

  /**
   * Validate notification configuration
   */
  validateConfig(config: NotificationConfig): Promise<Result<boolean>>;
}

export interface NotificationConfig {
  /** Type of notification */
  type: 'email' | 'push' | 'sms' | 'slack';
  
  /** Recipients */
  recipients: string[];
  
  /** Subject/title */
  subject?: string;
  
  /** Message body */
  message: string;
  
  /** Priority level */
  priority: 'low' | 'normal' | 'high' | 'urgent';
  
  /** Optional template ID */
  templateId?: string;
  
  /** Template variables */
  variables?: Record<string, any>;
  
  /** Delivery options */
  options?: {
    /** Delay delivery by specified milliseconds */
    delay?: number;
    
    /** Schedule delivery for specific time */
    scheduledFor?: Date;
    
    /** Retry configuration */
    retryConfig?: {
      maxRetries: number;
      backoffMs: number;
    };
    
    /** Callback URL for delivery status */
    webhookUrl?: string;
  };
}

export interface EmailNotificationConfig extends NotificationConfig {
  type: 'email';
  
  /** Email-specific options */
  emailOptions?: {
    /** HTML content */
    html?: string;
    
    /** Attachments */
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
    
    /** CC recipients */
    cc?: string[];
    
    /** BCC recipients */
    bcc?: string[];
    
    /** Reply-to address */
    replyTo?: string;
  };
}

export interface PushNotificationConfig extends NotificationConfig {
  type: 'push';
  
  /** Push-specific options */
  pushOptions?: {
    /** Notification icon */
    icon?: string;
    
    /** Badge count */
    badge?: number;
    
    /** Sound */
    sound?: string;
    
    /** Custom data payload */
    data?: Record<string, any>;
    
    /** Deep link URL */
    url?: string;
    
    /** Device tokens (if specific devices) */
    deviceTokens?: string[];
  };
}

export interface SMSNotificationConfig extends NotificationConfig {
  type: 'sms';
  
  /** SMS-specific options */
  smsOptions?: {
    /** Sender ID */
    senderId?: string;
    
    /** Message type */
    messageType?: 'transactional' | 'promotional';
  };
}

export interface SlackNotificationConfig extends NotificationConfig {
  type: 'slack';
  
  /** Slack-specific options */
  slackOptions?: {
    /** Channel or user IDs */
    channels?: string[];
    
    /** Bot username */
    username?: string;
    
    /** Bot icon */
    iconEmoji?: string;
    
    /** Message blocks (rich formatting) */
    blocks?: any[];
    
    /** Thread timestamp for replies */
    threadTs?: string;
  };
}

export interface NotificationResult {
  /** Unique notification ID */
  notificationId: string;
  
  /** Delivery status */
  status: 'sent' | 'failed' | 'pending' | 'scheduled';
  
  /** Number of successful deliveries */
  successCount: number;
  
  /** Number of failed deliveries */
  failureCount: number;
  
  /** Error messages for failures */
  errors?: string[];
  
  /** Provider-specific response data */
  providerResponse?: Record<string, any>;
  
  /** Delivery timestamp */
  deliveredAt?: Date;
}

export interface NotificationTemplate {
  /** Template ID */
  id: string;
  
  /** Template name */
  name: string;
  
  /** Template description */
  description: string;
  
  /** Notification type */
  type: 'email' | 'push' | 'sms' | 'slack';
  
  /** Subject template */
  subject?: string;
  
  /** Message template */
  message: string;
  
  /** Required variables */
  requiredVariables: string[];
  
  /** Optional variables */
  optionalVariables: string[];
}

/**
 * Supabase-based notification service adapter
 * Uses Supabase Edge Functions for notification delivery
 */
export class SupabaseNotificationServiceAdapter implements INotificationServiceAdapter {
  constructor(
    private readonly supabaseUrl: string,
    private readonly supabaseKey: string,
    private readonly functionName = 'send-notification'
  ) {}

  async sendEmail(config: EmailNotificationConfig): Promise<Result<NotificationResult>> {
    return this.sendNotification(config);
  }

  async sendPushNotification(config: PushNotificationConfig): Promise<Result<NotificationResult>> {
    return this.sendNotification(config);
  }

  async sendSMS(config: SMSNotificationConfig): Promise<Result<NotificationResult>> {
    return this.sendNotification(config);
  }

  async sendSlackNotification(config: SlackNotificationConfig): Promise<Result<NotificationResult>> {
    return this.sendNotification(config);
  }

  async getTemplates(): Promise<Result<NotificationTemplate[]>> {
    try {
      const response = await fetch(`${this.supabaseUrl}/functions/v1/get-notification-templates`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return Result.fail(`Failed to get templates: ${response.statusText}`);
      }

      const data = await response.json();
      return Result.ok(data.templates || []);
    } catch (error) {
      return Result.fail(
        `Failed to get templates: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async validateConfig(config: NotificationConfig): Promise<Result<boolean>> {
    try {
      // Basic validation
      if (!config.type) {
        return Result.fail('Notification type is required');
      }

      if (!config.recipients || config.recipients.length === 0) {
        return Result.fail('At least one recipient is required');
      }

      if (!config.message) {
        return Result.fail('Message is required');
      }

      // Type-specific validation
      switch (config.type) {
        case 'email':
          return this.validateEmailConfig(config as EmailNotificationConfig);
        case 'push':
          return this.validatePushConfig(config as PushNotificationConfig);
        case 'sms':
          return this.validateSMSConfig(config as SMSNotificationConfig);
        case 'slack':
          return this.validateSlackConfig(config as SlackNotificationConfig);
        default:
          return Result.fail(`Unsupported notification type: ${config.type}`);
      }
    } catch (error) {
      return Result.fail(
        `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async sendNotification(config: NotificationConfig): Promise<Result<NotificationResult>> {
    try {
      // Validate configuration
      const validationResult = await this.validateConfig(config);
      if (validationResult.isFailure) {
        return Result.fail(`Invalid notification configuration: ${validationResult.error}`);
      }

      // Send notification via Supabase Edge Function
      const response = await fetch(`${this.supabaseUrl}/functions/v1/${this.functionName}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        return Result.fail(`Notification delivery failed: ${errorData.error}`);
      }

      const result = await response.json();
      
      const notificationResult: NotificationResult = {
        notificationId: result.notificationId || this.generateNotificationId(),
        status: result.status || 'sent',
        successCount: result.successCount || config.recipients.length,
        failureCount: result.failureCount || 0,
        errors: result.errors,
        providerResponse: result.providerResponse,
        deliveredAt: result.deliveredAt ? new Date(result.deliveredAt) : new Date()
      };

      return Result.ok(notificationResult);
    } catch (error) {
      return Result.fail(
        `Notification delivery failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private validateEmailConfig(config: EmailNotificationConfig): Result<boolean> {
    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const recipient of config.recipients) {
      if (!emailRegex.test(recipient)) {
        return Result.fail(`Invalid email address: ${recipient}`);
      }
    }

    // Validate CC addresses
    if (config.emailOptions?.cc) {
      for (const cc of config.emailOptions.cc) {
        if (!emailRegex.test(cc)) {
          return Result.fail(`Invalid CC email address: ${cc}`);
        }
      }
    }

    // Validate BCC addresses
    if (config.emailOptions?.bcc) {
      for (const bcc of config.emailOptions.bcc) {
        if (!emailRegex.test(bcc)) {
          return Result.fail(`Invalid BCC email address: ${bcc}`);
        }
      }
    }

    return Result.ok(true);
  }

  private validatePushConfig(config: PushNotificationConfig): Result<boolean> {
    if (config.recipients.length === 0 && !config.pushOptions?.deviceTokens) {
      return Result.fail('Either recipients or device tokens must be provided for push notifications');
    }

    return Result.ok(true);
  }

  private validateSMSConfig(config: SMSNotificationConfig): Result<boolean> {
    // Validate phone numbers (basic validation)
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    
    for (const recipient of config.recipients) {
      if (!phoneRegex.test(recipient)) {
        return Result.fail(`Invalid phone number: ${recipient}`);
      }
    }

    // Check message length (SMS has character limits)
    if (config.message.length > 1600) { // SMS concat limit
      return Result.fail('SMS message too long (max 1600 characters)');
    }

    return Result.ok(true);
  }

  private validateSlackConfig(config: SlackNotificationConfig): Result<boolean> {
    if (!config.slackOptions?.channels && config.recipients.length === 0) {
      return Result.fail('Either channels or recipients must be provided for Slack notifications');
    }

    return Result.ok(true);
  }

  private generateNotificationId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Multi-provider notification service adapter
 * Routes notifications to different providers based on type
 */
export class MultiProviderNotificationServiceAdapter implements INotificationServiceAdapter {
  constructor(
    private readonly providers: {
      email?: INotificationServiceAdapter;
      push?: INotificationServiceAdapter;
      sms?: INotificationServiceAdapter;
      slack?: INotificationServiceAdapter;
    }
  ) {}

  async sendEmail(config: EmailNotificationConfig): Promise<Result<NotificationResult>> {
    const provider = this.providers.email;
    if (!provider) {
      return Result.fail('Email provider not configured');
    }
    return provider.sendEmail(config);
  }

  async sendPushNotification(config: PushNotificationConfig): Promise<Result<NotificationResult>> {
    const provider = this.providers.push;
    if (!provider) {
      return Result.fail('Push notification provider not configured');
    }
    return provider.sendPushNotification(config);
  }

  async sendSMS(config: SMSNotificationConfig): Promise<Result<NotificationResult>> {
    const provider = this.providers.sms;
    if (!provider) {
      return Result.fail('SMS provider not configured');
    }
    return provider.sendSMS(config);
  }

  async sendSlackNotification(config: SlackNotificationConfig): Promise<Result<NotificationResult>> {
    const provider = this.providers.slack;
    if (!provider) {
      return Result.fail('Slack provider not configured');
    }
    return provider.sendSlackNotification(config);
  }

  async getTemplates(): Promise<Result<NotificationTemplate[]>> {
    // Combine templates from all providers
    const allTemplates: NotificationTemplate[] = [];
    
    for (const [type, provider] of Object.entries(this.providers)) {
      if (provider) {
        const templatesResult = await provider.getTemplates();
        if (templatesResult.isSuccess) {
          allTemplates.push(...templatesResult.value);
        }
      }
    }

    return Result.ok(allTemplates);
  }

  async validateConfig(config: NotificationConfig): Promise<Result<boolean>> {
    const provider = this.providers[config.type];
    if (!provider) {
      return Result.fail(`Provider not configured for notification type: ${config.type}`);
    }
    return provider.validateConfig(config);
  }
}