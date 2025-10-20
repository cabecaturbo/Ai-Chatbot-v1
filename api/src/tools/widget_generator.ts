// Papercups widget code generator for multi-tenant setup
import { Tenant } from '../types/database';

interface WidgetConfig {
  token: string;
  inbox?: string | undefined;
  title?: string | undefined;
  subtitle?: string | undefined;
  primaryColor?: string | undefined;
  greeting?: string | undefined;
  baseUrl: string;
  requireEmailUpfront?: boolean | undefined;
  showAgentAvailability?: boolean | undefined;
  customer?: {
    name?: string | undefined;
    email?: string | undefined;
    external_id?: string | undefined;
    metadata?: Record<string, any> | undefined;
  } | undefined;
}

interface WidgetCodeOptions {
  tenant: Tenant;
  customizations?: {
    title?: string;
    subtitle?: string;
    primaryColor?: string;
    greeting?: string;
    requireEmailUpfront?: boolean;
    showAgentAvailability?: boolean;
  };
}

export class WidgetGenerator {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env['PAPERCUPS_URL'] || 'https://papercups.netia.ai';
  }

  /**
   * Generate widget code for a specific tenant
   */
  generateWidgetCode(options: WidgetCodeOptions): string {
    const { tenant, customizations = {} } = options;

    if (!tenant.papercups_account_id) {
      throw new Error(`Tenant ${tenant.id} does not have a Papercups account ID`);
    }

    const config: WidgetConfig = {
      token: tenant.papercups_account_id, // Using account ID as token
      title: customizations.title || `Welcome to ${tenant.name}!`,
      subtitle: customizations.subtitle || 'How can we help you today?',
      primaryColor: customizations.primaryColor || '#3b82f6',
      greeting: customizations.greeting || 'Hi! How can we assist you?',
      baseUrl: this.baseUrl,
      requireEmailUpfront: customizations.requireEmailUpfront ?? true,
      showAgentAvailability: customizations.showAgentAvailability ?? true,
      customer: {
        name: 'Website Visitor',
        email: 'visitor@example.com',
        external_id: 'unique-visitor-id',
        metadata: {
          source: 'website',
          tenant_id: tenant.id,
          page: 'window.location.pathname'
        }
      }
    };

    return this.buildWidgetHTML(config);
  }

  /**
   * Generate widget code with custom token (for advanced setups)
   */
  generateWidgetCodeWithToken(
    tenant: Tenant,
    token: string,
    inbox?: string,
    customizations?: WidgetCodeOptions['customizations']
  ): string {
    const config: WidgetConfig = {
      token,
      inbox,
      title: customizations?.title || `Welcome to ${tenant.name}!`,
      subtitle: customizations?.subtitle || 'How can we help you today?',
      primaryColor: customizations?.primaryColor || '#3b82f6',
      greeting: customizations?.greeting || 'Hi! How can we assist you?',
      baseUrl: this.baseUrl,
      requireEmailUpfront: customizations?.requireEmailUpfront ?? true,
      showAgentAvailability: customizations?.showAgentAvailability ?? true,
      customer: {
        name: 'Website Visitor',
        email: 'visitor@example.com',
        external_id: 'unique-visitor-id',
        metadata: {
          source: 'website',
          tenant_id: tenant.id,
          page: 'window.location.pathname'
        }
      }
    };

    return this.buildWidgetHTML(config);
  }

  /**
   * Build the complete HTML widget code
   */
  private buildWidgetHTML(config: WidgetConfig): string {
    const configJson = JSON.stringify(config, null, 2);
    
    return `<!-- Papercups Chat Widget for ${config.title} -->
<script>
  window.Papercups = {
    config: ${configJson}
  };
</script>
<script
  type="text/javascript"
  async
  defer
  src="${config.baseUrl}/widget.js"
></script>
<!-- End Papercups Chat Widget -->`;
  }

  /**
   * Generate a simple embed code (just the script tags)
   */
  generateSimpleEmbedCode(options: WidgetCodeOptions): string {
    const { tenant } = options;
    
    if (!tenant.papercups_account_id) {
      throw new Error(`Tenant ${tenant.id} does not have a Papercups account ID`);
    }

    return `<script>
  window.Papercups = {
    config: {
      token: '${tenant.papercups_account_id}',
      baseUrl: '${this.baseUrl}',
      title: 'Welcome to ${tenant.name}!',
      requireEmailUpfront: true,
      showAgentAvailability: true
    }
  };
</script>
<script type="text/javascript" async defer src="${this.baseUrl}/widget.js"></script>`;
  }

  /**
   * Generate widget code for React/Next.js applications
   */
  generateReactWidgetCode(options: WidgetCodeOptions): string {
    const { tenant, customizations = {} } = options;
    
    if (!tenant.papercups_account_id) {
      throw new Error(`Tenant ${tenant.id} does not have a Papercups account ID`);
    }

    return `// Papercups Chat Widget for React/Next.js
// Add this to your _app.js or _document.js

useEffect(() => {
  if (typeof window !== 'undefined') {
    window.Papercups = {
      config: {
        token: '${tenant.papercups_account_id}',
        baseUrl: '${this.baseUrl}',
        title: '${customizations.title || `Welcome to ${tenant.name}!`}',
        subtitle: '${customizations.subtitle || 'How can we help you today?'}',
        primaryColor: '${customizations.primaryColor || '#3b82f6'}',
        greeting: '${customizations.greeting || 'Hi! How can we assist you?'}',
        requireEmailUpfront: ${customizations.requireEmailUpfront ?? true},
        showAgentAvailability: ${customizations.showAgentAvailability ?? true},
        customer: {
          metadata: {
            source: 'website',
            tenant_id: '${tenant.id}',
            page: window.location.pathname
          }
        }
      }
    };

    const script = document.createElement('script');
    script.src = '${this.baseUrl}/widget.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
}, []);`;
  }
}

// Export singleton instance
export const widgetGenerator = new WidgetGenerator();

// Export individual functions for backward compatibility
export function generateWidgetCode(options: WidgetCodeOptions): string {
  return widgetGenerator.generateWidgetCode(options);
}

export function generateSimpleEmbedCode(options: WidgetCodeOptions): string {
  return widgetGenerator.generateSimpleEmbedCode(options);
}

export function generateReactWidgetCode(options: WidgetCodeOptions): string {
  return widgetGenerator.generateReactWidgetCode(options);
}
