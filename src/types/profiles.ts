// types/profiles.ts - Types et interfaces pour le système de profil

export interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserPreferences {
  id?: string;
  userId?: string;
  minAge: number;
  maxAge: number;
  maxDistance: number;
  gender: string | null;
  lookingFor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  location: string | null;
  department?: string | null;
  region?: string | null;
  postcode?: string | null;
  
  // Informations personnelles
  gender: string | null;
  profession: string | null;
  maritalStatus: string | null;
  zodiacSign: string | null;
  dietType: string | null;
  religion: string | null;
  ethnicity: string | null;
  
  // Collections
  interests: string[];
  photos: Photo[];
  preferences?: UserPreferences;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isVerified?: boolean;
  isActive?: boolean;
}

// Types pour les données de formulaire
export interface BasicInfoFormData {
  name: string;
  age: number | null;
  bio: string;
  location: string;
  department?: string;
  region?: string;
  postcode?: string;
  profession: string;
}

export interface PersonalInfoFormData {
  gender: string;
  profession: string;
  maritalStatus: string;
  zodiacSign: string;
  dietType: string;
  religion: string;
  ethnicity: string;
  interests: string[];
}

export interface PreferencesFormData {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  gender: string;
  lookingFor: string;
}

// Types pour les composants
export interface ProfileFormProps {
  profile: UserProfile | null;
  loading: boolean;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export interface PhotosManagerProps {
  photos: Photo[];
  onMessage: (message: string, type: MessageType) => void;
  onPhotosChange?: () => void;
}

export interface SettingsPanelProps {
  profile: UserProfile | null;
  photos: Photo[];
  session: any;
  onMessage: (message: string, type?: MessageType) => void;
}

// Types pour les messages et notifications
export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationMessage {
  id: string;
  type: MessageType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Types pour les onglets
export type TabType = 'overview' | 'edit' | 'personal' | 'photos' | 'preferences' | 'settings';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: any;
  color: string;
  description: string;
  badge?: string | number;
}

// Types pour l'API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface PhotoUploadResponse {
  id: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}