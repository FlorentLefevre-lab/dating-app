// src/types/discover.ts
export interface Profile {
    id: string;
    name: string;
    age: number;
    bio: string;
    location: string;
    department: string;
    region: string;
    profession: string;
    interests: string[];
    photos: Array<{
      id: string;
      url: string;
      isPrimary: boolean;
    }>;
    compatibilityScore: number;
  }
  
  export interface MatchResult {
    isMatch: boolean;
    matchUser?: {
      id: string;
      name: string;
    };
  }