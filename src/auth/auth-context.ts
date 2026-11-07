export interface AuthContext {
  applicationId: string;
  organizationId: string;
  environment: string;
  scopes: string[];
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}
