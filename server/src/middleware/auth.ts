import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// JWKS client to fetch public keys from Clerk
let jwks: jwksClient.JwksClient | null = null;

const getJwksClient = () => {
  if (!jwks) {
    // The JWKS URL format for Clerk
    const clerkJwksUrl = process.env.CLERK_JWKS_URL ||
      `https://${process.env.CLERK_DOMAIN || 'clerk.your-domain.com'}/.well-known/jwks.json`;

    jwks = jwksClient({
      jwksUri: clerkJwksUrl,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
    });
  }
  return jwks;
};

const getSigningKey = (header: jwt.JwtHeader): Promise<string> => {
  return new Promise((resolve, reject) => {
    const client = getJwksClient();
    client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      if (!key) {
        reject(new Error('No signing key found'));
        return;
      }
      const signingKey = key.getPublicKey();
      resolve(signingKey);
    });
  });
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // First decode the token to get the header
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // If CLERK_SECRET_KEY is set, verify the token properly
    // Otherwise, for development, just decode and extract the user ID
    if (process.env.CLERK_SECRET_KEY && process.env.CLERK_JWKS_URL) {
      try {
        const signingKey = await getSigningKey(decoded.header);
        const verified = jwt.verify(token, signingKey) as jwt.JwtPayload;

        if (!verified.sub) {
          return res.status(401).json({ error: 'Invalid token: missing user ID' });
        }

        req.userId = verified.sub;
      } catch (verifyError) {
        console.error('Token verification failed:', verifyError);
        return res.status(401).json({ error: 'Token verification failed' });
      }
    } else {
      // Development mode: just extract the user ID from the token
      const payload = decoded.payload as jwt.JwtPayload;
      if (!payload.sub) {
        return res.status(401).json({ error: 'Invalid token: missing user ID' });
      }
      req.userId = payload.sub;
    }

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
