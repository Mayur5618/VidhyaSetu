import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mysecretkey';

export function getUserFromToken(token) {
  try {
    if (!token) return null;
    // Remove 'Bearer ' prefix if present
    if (token.startsWith('Bearer ')) {
      token = token.slice(7);
    }
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
} 