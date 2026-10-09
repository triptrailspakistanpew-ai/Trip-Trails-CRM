declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        agencyId: string;
        branchId?: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
        status: string;
        phone?: string;
        avatarUrl?: string;
        lastLoginAt?: Date;
      };
      agencyId?: string;
    }
  }
}

export {};
