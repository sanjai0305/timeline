import { DecodedIdToken } from 'firebase-admin/auth';
import { MemberRole } from './api';

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
      timelineRole?: MemberRole;
      timeline?: any;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: DecodedIdToken;
    timelineRole?: MemberRole;
    timeline?: any;
  }
}

