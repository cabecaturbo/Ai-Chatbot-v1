/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    STACK_PROJECT_ID: process.env.STACK_PROJECT_ID,
    STACK_PUBLISHABLE_CLIENT_KEY: process.env.STACK_PUBLISHABLE_CLIENT_KEY,
  },
}

module.exports = nextConfig
