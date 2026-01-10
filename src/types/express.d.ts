import { Request } from 'express';
import { JwtPayload } from './index';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
