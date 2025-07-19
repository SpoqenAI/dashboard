import { Environment, LogLevel, Paddle, PaddleOptions } from '@paddle/paddle-node-sdk';

export function getPaddleServerInstance() {
  const paddleOptions: PaddleOptions = {
    environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as Environment) ?? Environment.sandbox,
    logLevel: LogLevel.error,
  };

  if (!process.env.PADDLE_API_KEY) {
    console.error('Paddle API key is missing');
  }

  return new Paddle(process.env.PADDLE_API_KEY!, paddleOptions);
} 