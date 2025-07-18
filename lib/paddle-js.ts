// Paddle JS helper for client-side overlay checkout initialization
// This runs only in the browser and lazily loads the @paddle/paddle-js package.

let paddleInstance: any | null = null;

export async function getPaddleInstance(env: 'sandbox' | 'production') {
  if (paddleInstance) return paddleInstance;

  if (typeof window === 'undefined') {
    throw new Error('Paddle JS can only be initialized in the browser');
  }

  const PaddleMod = await import('@paddle/paddle-js');
  const Paddle = (PaddleMod as any).default || (PaddleMod as any);

  // Set environment before setup
  if (env === 'sandbox') {
    Paddle.Environment.set('sandbox');
  }

  const clientToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!clientToken) {
    throw new Error('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is not set');
  }

  // Initialize Paddle (Setup)
  if (typeof Paddle.Setup === 'function') {
    Paddle.Setup({ token: clientToken });
  } else if (typeof Paddle.Initialize === 'function') {
    // fallback name just in case of older SDK
    Paddle.Initialize({ token: clientToken });
  }

  paddleInstance = Paddle;
  return paddleInstance;
}

export async function openPaddleCheckout(
  checkoutId: string,
  env: 'sandbox' | 'production' = 'production',
  onComplete?: () => void,
  onClose?: () => void
) {
  const Paddle = await getPaddleInstance(env);
  return new Promise<void>((resolve, reject) => {
    try {
      const options: any = { checkoutId };
      if (onComplete || onClose) {
        options.events = {
          complete: () => {
            onComplete?.();
            resolve();
          },
          close: () => {
            onClose?.();
            // still resolve; overlay closed by user
            resolve();
          },
        };
      } else {
        // if no events we resolve immediately
        resolve();
      }
      Paddle.Checkout.open(options);
    } catch (err) {
      reject(err);
    }
  });
}
