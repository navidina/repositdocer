import { Request, Response, NextFunction } from 'express';

// In .env, define: INTEGRATION_API_KEY=your_secret_key_here
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('x-api-key');

  if (!apiKey || apiKey !== process.env.INTEGRATION_API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Please provide a valid API Key in the x-api-key header.'
    });
  }

  next();
};
