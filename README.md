# Instagram DM Automation Platform

A SaaS platform for automating Instagram DM responses and comment management.

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

\`\`\`
# Instagram API Credentials
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/auth/callback/instagram

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# Database
DATABASE_URL=your_database_connection_string

# Azure OpenAI Services for Smart Responses
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name
AZURE_OPENAI_API_VERSION=2023-05-15

# Stripe for Payments
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### How to Obtain Environment Variables

#### Instagram API Credentials
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use an existing one
3. Add the Instagram Basic Display product
4. Configure your app and get the Client ID and Client Secret
5. Set the redirect URI to `http://localhost:3000/api/auth/callback/instagram` for development

#### Authentication
- `NEXTAUTH_URL`: Your application URL (use `http://localhost:3000` for development)
- `NEXTAUTH_SECRET`: Generate a secure random string using `openssl rand -base64 32` in your terminal

#### Database
- `DATABASE_URL`: Get this from your database provider (e.g., Neon, Supabase, etc.)
  - For Neon: Go to your project dashboard → Connection Details → Connection String

#### Azure OpenAI Services
1. Go to [Azure Portal](https://portal.azure.com/)
2. Create an Azure OpenAI resource
3. Once created, go to the resource and click on "Keys and Endpoint" to get:
   - `AZURE_OPENAI_API_KEY`: Key 1 or Key 2
   - `AZURE_OPENAI_ENDPOINT`: Endpoint URL
4. Go to "Model Deployments" and create a deployment
   - `AZURE_OPENAI_DEPLOYMENT_NAME`: The name you give to your deployment
   - `AZURE_OPENAI_API_VERSION`: Use the latest version (e.g., "2023-05-15")

#### Stripe
1. Create an account on [Stripe](https://stripe.com/)
2. Go to the Developers section → API keys
   - `STRIPE_SECRET_KEY`: Secret key (starts with "sk_")
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Publishable key (starts with "pk_")
3. For webhook secret:
   - Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
   - Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
   - The webhook signing secret will be displayed in the terminal

#### App Configuration
- `NEXT_PUBLIC_APP_URL`: Your application URL (use `http://localhost:3000` for development)

### Installation

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Set up the database:
   \`\`\`
   npx prisma migrate dev
   \`\`\`

3. Run the development server:
   \`\`\`
   npm run dev
   \`\`\`

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- Instagram DM automation
- Comment management
- AI-powered responses with Azure OpenAI
- Analytics dashboard
- Subscription management
