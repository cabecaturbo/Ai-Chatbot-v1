import { StackAuth } from '@stackframe/stack'

export const stackAuth = StackAuth({
  projectId: process.env.STACK_PROJECT_ID!,
  publishableClientKey: process.env.STACK_PUBLISHABLE_CLIENT_KEY!,
  secretKey: process.env.STACK_SECRET_KEY!,
  
  // Configure authentication providers
  urls: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    afterSignIn: '/dashboard',
    afterSignUp: '/dashboard',
  },
  
  // Configure user roles
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'customer',
        options: ['admin', 'customer'],
      },
      tenantId: {
        type: 'string',
        defaultValue: null,
      },
    },
  },
  
  // Configure email templates
  email: {
    magicLink: {
      subject: 'Sign in to Netia AI Dashboard',
      html: `
        <h1>Sign in to Netia AI Dashboard</h1>
        <p>Click the link below to sign in to your account:</p>
        <a href="{{magicLink}}">Sign In</a>
        <p>This link will expire in 10 minutes.</p>
        <p>If you didn't request this email, you can safely ignore it.</p>
      `,
    },
  },
})

export default stackAuth
