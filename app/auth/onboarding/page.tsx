// app/auth/onboarding/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card } from '@/components/ui';
import {
  ChevronRight,
  ChevronLeft,
  Heart,
  MapPin,
  Users,
  Calendar,
  Target,
  Sparkles,
  Check,
  Loader2,
  Search,
  X
} from 'lucide-react';
import {
  GENDERS,
  LOOKING_FOR_OPTIONS,
  DISTANCE_OPTIONS,
  INTEREST_OPTIONS
} from '@/constants/profileData';

// Type pour les données de l'API data.gouv.fr
interface CommuneData {
  nom: string;
  code: string;
  codeDepartement: string;
  codeRegion: string;
  codesPostaux: string[];
  population: number;
  departement?: {
    nom: string;
    code: string;
  };
  region?: {
    nom: string;
    code: string;
  };
}

// ================================
// TYPES
// ================================

interface OnboardingData {
  // Profil utilisateur
  gender: string;
  birthDate: string;
  location: string;
  department: string;
  region: string;
  postcode: string;
  // Préférences de recherche
  preferredGender: string;
  minAge: number;
  maxAge: number;
  maxDistance: number;
  lookingFor: string;
  interests: string[];
}

// ================================
// CONSTANTES
// ================================

const STEPS = [
  { id: 'welcome', title: 'Bienvenue', icon: Heart },
  { id: 'profile', title: 'Votre profil', icon: Users },
  { id: 'location', title: 'Localisation', icon: MapPin },
  { id: 'preferences', title: 'Qui recherchez-vous', icon: Target },
  { id: 'age', title: 'Tranche d\'âge', icon: Calendar },
  { id: 'distance', title: 'Distance', icon: MapPin },
  { id: 'relationship', title: 'Type de relation', icon: Heart },
  { id: 'interests', title: 'Centres d\'intérêt', icon: Sparkles },
  { id: 'complete', title: 'Terminé', icon: Check }
];

const GENDER_OPTIONS_SEARCH = [
  { value: 'FEMALE', label: 'Des femmes', emoji: '👩' },
  { value: 'MALE', label: 'Des hommes', emoji: '👨' },
  { value: 'ALL', label: 'Tout le monde', emoji: '👥' }
];

const GENDER_OPTIONS_PROFILE = [
  { value: 'MALE', label: 'Homme', emoji: '👨' },
  { value: 'FEMALE', label: 'Femme', emoji: '👩' },
  { value: 'NON_BINARY', label: 'Non-binaire', emoji: '🧑' }
];

const POPULAR_INTERESTS = [
  'Voyage', 'Musique', 'Cinéma', 'Sport', 'Cuisine',
  'Lecture', 'Nature', 'Photographie', 'Art', 'Danse',
  'Gaming', 'Yoga', 'Running', 'Concert', 'Restaurant'
];

// ================================
// COMPOSANT PRINCIPAL
// ================================

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<OnboardingData>({
    gender: '',
    birthDate: '',
    location: '',
    department: '',
    region: '',
    postcode: '',
    preferredGender: '',
    minAge: 18,
    maxAge: 35,
    maxDistance: 50,
    lookingFor: '',
    interests: []
  });

  // États pour l'autocomplétion des villes
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState<CommuneData[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCityIndex, setSelectedCityIndex] = useState(-1);
  const [isValidCity, setIsValidCity] = useState(false);
  const [selectedCityData, setSelectedCityData] = useState<CommuneData | null>(null);

  // Refs pour l'autocomplétion
  const cityInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Redirection si non authentifié
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // Vérifier si l'onboarding est déjà complété
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch('/api/auth/onboarding/status');
          const result = await response.json();
          if (result.completed) {
            router.push('/home');
          }
        } catch (err) {
          console.warn('Erreur vérification onboarding:', err);
        }
      }
    };
    checkOnboardingStatus();
  }, [session, router]);

  const userName = session?.user?.name?.split(' ')[0] || 'vous';

  // Navigation
  const nextStep = () => {
    if (currentStep < STEPS.length - 1 && isStepValid()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Mise à jour des données
  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Toggle intérêt
  const toggleInterest = (interest: string) => {
    setData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 10
          ? [...prev.interests, interest]
          : prev.interests
    }));
  };

  // Soumission finale
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la sauvegarde');
      }

      // Redirection vers la page d'accueil
      router.push('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setIsSubmitting(false);
    }
  };

  // Validation de l'étape courante
  const isStepValid = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return true;
      case 'profile':
        return data.gender !== '' && data.birthDate !== '' && isBirthDateValid(data.birthDate);
      case 'location':
        // La ville DOIT être sélectionnée depuis les suggestions de l'API
        return isValidCity && selectedCityData !== null;
      case 'preferences':
        return data.preferredGender !== '';
      case 'age':
        return data.minAge >= 18 && data.maxAge >= data.minAge && data.maxAge <= 99;
      case 'distance':
        return data.maxDistance > 0;
      case 'relationship':
        return data.lookingFor !== '';
      case 'interests':
        return true; // Optionnel
      case 'complete':
        return true;
      default:
        return true;
    }
  };

  // Message de statut pour la ville (comme dans BasicInfoForm)
  const getCityStatusMessage = () => {
    if (!cityQuery.trim()) {
      return {
        type: 'warning',
        message: 'Saisissez le nom de votre ville et sélectionnez-la dans la liste'
      };
    }

    if (isValidCity && selectedCityData) {
      return {
        type: 'success',
        message: `Ville validée : ${selectedCityData.nom} (${selectedCityData.departement?.nom || ''}, ${selectedCityData.region?.nom || ''})`
      };
    }

    if (isSearching) {
      return {
        type: 'info',
        message: 'Recherche en cours...'
      };
    }

    if (cities.length > 0) {
      return {
        type: 'info',
        message: 'Sélectionnez votre ville dans la liste ci-dessous'
      };
    }

    return {
      type: 'error',
      message: 'Aucune ville trouvée - Sélectionnez une ville valide dans les suggestions'
    };
  };

  // Calcul de l'âge depuis la date de naissance
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Vérification de l'âge minimum
  const isBirthDateValid = (birthDate: string): boolean => {
    if (!birthDate) return false;
    return calculateAge(birthDate) >= 18;
  };

  // ================================
  // AUTOCOMPLÉTION VILLE
  // ================================

  // Rechercher les villes via l'API data.gouv.fr
  const searchCities = async (query: string) => {
    if (query.length < 2) {
      setCities([]);
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(query)}&fields=nom,code,codesPostaux,codeDepartement,codeRegion,population,departement,region&boost=population&limit=10`
      );

      if (response.ok) {
        const data: CommuneData[] = await response.json();
        setCities(data);
        setShowSuggestions(true);
        setSelectedCityIndex(-1);
      }
    } catch (error) {
      console.error('Erreur lors de la recherche de villes:', error);
      setCities([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Sélectionner une ville
  const selectCity = (city: CommuneData) => {
    const cityLocation = `${city.nom}${city.codesPostaux.length > 0 ? ` (${city.codesPostaux[0]})` : ''}`;

    setCityQuery(cityLocation);
    setData(prev => ({
      ...prev,
      location: cityLocation,
      department: city.departement?.nom || '',
      region: city.region?.nom || '',
      postcode: city.codesPostaux[0] || ''
    }));

    setIsValidCity(true);
    setSelectedCityData(city);
    setShowSuggestions(false);
    setCities([]);
    setSelectedCityIndex(-1);
  };

  // Gestion de la saisie dans le champ ville
  const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCityQuery(value);

    // Invalider la ville si l'utilisateur modifie manuellement
    if (isValidCity && selectedCityData) {
      const expectedLocation = `${selectedCityData.nom}${selectedCityData.codesPostaux.length > 0 ? ` (${selectedCityData.codesPostaux[0]})` : ''}`;
      if (value !== expectedLocation) {
        setIsValidCity(false);
        setSelectedCityData(null);
        setData(prev => ({
          ...prev,
          location: value,
          department: '',
          region: '',
          postcode: ''
        }));
      }
    } else {
      setData(prev => ({ ...prev, location: value }));
    }

    // Si le champ est vidé, réinitialiser l'état
    if (!value.trim()) {
      setIsValidCity(false);
      setSelectedCityData(null);
    }
  };

  // Gestion du clavier pour la navigation dans les suggestions
  const handleCityInputKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || cities.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedCityIndex(prev =>
          prev < cities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedCityIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedCityIndex >= 0 && selectedCityIndex < cities.length) {
          selectCity(cities[selectedCityIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedCityIndex(-1);
        cityInputRef.current?.blur();
        break;
    }
  };

  // Debounce de la recherche
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (cityQuery.trim() && !isValidCity) {
      debounceRef.current = setTimeout(() => {
        searchCities(cityQuery);
      }, 300);
    } else {
      setCities([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [cityQuery, isValidCity]);

  // Fermer les suggestions quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        cityInputRef.current &&
        !cityInputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setSelectedCityIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  // ================================
  // RENDU DES ÉTAPES
  // ================================

  const renderStep = () => {
    const stepId = STEPS[currentStep].id;

    switch (stepId) {
      // Étape 1: Bienvenue
      case 'welcome':
        return (
          <div className="text-center">
            <div className="text-6xl mb-6">👋</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Bienvenue {userName} !
            </h2>
            <p className="text-gray-600 text-lg mb-8">
              Prenons quelques instants pour configurer votre profil et vos préférences de recherche.
              Cela nous permettra de vous proposer des profils qui vous correspondent vraiment.
            </p>
            <div className="bg-pink-50 rounded-xl p-4 text-left">
              <p className="text-pink-800 text-sm">
                <strong>Cela ne prendra que 2 minutes</strong> et vous pourrez modifier ces informations à tout moment dans vos paramètres.
              </p>
            </div>
          </div>
        );

      // Étape 2: Profil (Genre + Date de naissance)
      case 'profile':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Parlez-nous de vous
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Ces informations seront visibles sur votre profil
            </p>

            {/* Genre */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Vous êtes...
              </label>
              <div className="grid grid-cols-3 gap-3">
                {GENDER_OPTIONS_PROFILE.map(option => (
                  <button
                    key={option.value}
                    onClick={() => updateData('gender', option.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      data.gender === option.value
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{option.emoji}</div>
                    <div className="text-sm font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date de naissance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Date de naissance
              </label>
              <input
                type="date"
                value={data.birthDate}
                onChange={(e) => updateData('birthDate', e.target.value)}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 text-lg"
              />
              {data.birthDate && !isBirthDateValid(data.birthDate) && (
                <p className="mt-2 text-red-600 text-sm">
                  Vous devez avoir au moins 18 ans pour utiliser cette application.
                </p>
              )}
              {data.birthDate && isBirthDateValid(data.birthDate) && (
                <p className="mt-2 text-gray-500 text-sm">
                  Vous avez {calculateAge(data.birthDate)} ans
                </p>
              )}
            </div>
          </div>
        );

      // Étape 3: Localisation
      case 'location':
        const cityStatus = getCityStatusMessage();
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Où habitez-vous ?
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Pour vous proposer des profils près de chez vous
            </p>

            <div className="mb-6 relative">
              <div className="relative">
                <input
                  ref={cityInputRef}
                  type="text"
                  value={cityQuery}
                  onChange={handleCityInputChange}
                  onKeyDown={handleCityInputKeyDown}
                  onFocus={() => {
                    if (cities.length > 0 && !isValidCity) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="Tapez le nom de votre ville..."
                  autoComplete="off"
                  className={`w-full px-4 py-3 pr-10 border-2 rounded-xl focus:outline-none focus:ring-2 text-lg transition-colors ${
                    isValidCity
                      ? 'border-green-500 focus:ring-green-500 bg-green-50'
                      : cityQuery && !isValidCity && cities.length === 0 && !isSearching
                        ? 'border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:ring-pink-500'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  {isSearching ? (
                    <Loader2 className="h-5 w-5 text-pink-500 animate-spin" />
                  ) : isValidCity ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : cityQuery && cities.length === 0 ? (
                    <X className="h-5 w-5 text-red-400" />
                  ) : cityQuery ? (
                    <Search className="h-5 w-5 text-gray-400" />
                  ) : (
                    <MapPin className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Liste des suggestions */}
              <AnimatePresence>
                {showSuggestions && cities.length > 0 && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-auto"
                  >
                    {cities.map((city, index) => (
                      <motion.div
                        key={`${city.code}-${index}`}
                        whileHover={{ backgroundColor: '#fdf2f8' }}
                        onClick={() => selectCity(city)}
                        className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                          selectedCityIndex === index ? 'bg-pink-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <MapPin className="h-4 w-4 text-pink-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {city.nom}
                              </span>
                              {city.codesPostaux.length > 0 && (
                                <span className="text-sm text-gray-500">
                                  ({city.codesPostaux[0]})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {city.departement?.nom && city.region?.nom && (
                                <span>{city.departement.nom}, {city.region.nom}</span>
                              )}
                              {city.population && (
                                <span className="ml-2">• {city.population.toLocaleString()} hab.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Message de validation (comme BasicInfoForm) */}
            {isValidCity && selectedCityData && (
              <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
                <span>
                  <Check className="h-4 w-4 inline mr-2" />
                  {selectedCityData.nom}
                  {selectedCityData.departement?.nom && ` - ${selectedCityData.departement.nom}`}
                  {selectedCityData.region?.nom && ` (${selectedCityData.region.nom})`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCityQuery('');
                    setIsValidCity(false);
                    setSelectedCityData(null);
                    setData(prev => ({
                      ...prev,
                      location: '',
                      department: '',
                      region: '',
                      postcode: ''
                    }));
                    cityInputRef.current?.focus();
                  }}
                  className="text-green-600 hover:text-green-800 ml-2 p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Box d'information avec statut (comme BasicInfoForm) */}
            <div className={`rounded-xl p-4 text-sm ${
              cityStatus.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : cityStatus.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : cityStatus.type === 'warning'
                    ? 'bg-amber-50 border border-amber-200'
                    : 'bg-blue-50 border border-blue-200'
            }`}>
              <p className={`font-medium mb-1 ${
                cityStatus.type === 'success'
                  ? 'text-green-800'
                  : cityStatus.type === 'error'
                    ? 'text-red-800'
                    : cityStatus.type === 'warning'
                      ? 'text-amber-800'
                      : 'text-blue-800'
              }`}>
                {cityStatus.type === 'success' ? '✅' : cityStatus.type === 'error' ? '❌' : cityStatus.type === 'warning' ? '⚠️' : 'ℹ️'} Validation de la ville
              </p>
              <p className={`${
                cityStatus.type === 'success'
                  ? 'text-green-700'
                  : cityStatus.type === 'error'
                    ? 'text-red-700'
                    : cityStatus.type === 'warning'
                      ? 'text-amber-700'
                      : 'text-blue-700'
              }`}>
                {cityStatus.message}
              </p>
            </div>
          </div>
        );

      // Étape 4: Préférences de genre
      case 'preferences':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Qui recherchez-vous ?
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Je souhaite rencontrer...
            </p>

            <div className="space-y-3">
              {GENDER_OPTIONS_SEARCH.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateData('preferredGender', option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                    data.preferredGender === option.value
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <span className="text-3xl">{option.emoji}</span>
                  <span className="text-lg font-medium">{option.label}</span>
                  {data.preferredGender === option.value && (
                    <Check className="w-5 h-5 text-pink-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      // Étape 5: Tranche d'âge
      case 'age':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Quelle tranche d'âge ?
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Entre {data.minAge} et {data.maxAge} ans
            </p>

            <div className="space-y-8">
              {/* Âge minimum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Âge minimum : <span className="text-pink-600 font-bold">{data.minAge} ans</span>
                </label>
                <input
                  type="range"
                  min="18"
                  max="99"
                  value={data.minAge}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateData('minAge', val);
                    if (val > data.maxAge) {
                      updateData('maxAge', val);
                    }
                  }}
                  className="w-full h-3 bg-gradient-to-r from-pink-200 to-purple-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Âge maximum */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Âge maximum : <span className="text-pink-600 font-bold">{data.maxAge} ans</span>
                </label>
                <input
                  type="range"
                  min="18"
                  max="99"
                  value={data.maxAge}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateData('maxAge', val);
                    if (val < data.minAge) {
                      updateData('minAge', val);
                    }
                  }}
                  className="w-full h-3 bg-gradient-to-r from-pink-200 to-purple-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            <div className="mt-8 bg-pink-50 rounded-xl p-4 text-center">
              <p className="text-pink-800">
                Vous recherchez des personnes entre <strong>{data.minAge}</strong> et <strong>{data.maxAge}</strong> ans
              </p>
            </div>
          </div>
        );

      // Étape 6: Distance
      case 'distance':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              À quelle distance ?
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Distance maximale depuis {data.location || 'votre position'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              {DISTANCE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateData('maxDistance', option.value)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    data.maxDistance === option.value
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <div className="text-xl font-bold text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        );

      // Étape 7: Type de relation
      case 'relationship':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Que recherchez-vous ?
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Le type de relation qui vous intéresse
            </p>

            <div className="space-y-3">
              {LOOKING_FOR_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => updateData('lookingFor', option.value)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    data.lookingFor === option.value
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </button>
              ))}
            </div>
          </div>
        );

      // Étape 8: Centres d'intérêt
      case 'interests':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Vos centres d'intérêt
            </h2>
            <p className="text-gray-600 text-center mb-2">
              Sélectionnez jusqu'à 10 centres d'intérêt (optionnel)
            </p>
            <p className="text-sm text-pink-600 text-center mb-8">
              {data.interests.length}/10 sélectionnés
            </p>

            <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
              {POPULAR_INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-4 py-2 rounded-full text-sm transition-all ${
                    data.interests.includes(interest)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm text-gray-500 text-center">
              Vous pourrez en ajouter d'autres plus tard dans votre profil
            </p>
          </div>
        );

      // Étape finale: Terminé
      case 'complete':
        return (
          <div className="text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              C'est tout bon !
            </h2>
            <p className="text-gray-600 text-lg mb-8">
              Votre profil est prêt. Vous pouvez maintenant découvrir des profils qui vous correspondent.
            </p>

            {/* Résumé */}
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-8">
              <div className="flex justify-between">
                <span className="text-gray-600">Vous êtes :</span>
                <span className="font-medium">
                  {GENDER_OPTIONS_PROFILE.find(g => g.value === data.gender)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Localisation :</span>
                <span className="font-medium">{data.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vous recherchez :</span>
                <span className="font-medium">
                  {GENDER_OPTIONS_SEARCH.find(g => g.value === data.preferredGender)?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tranche d'âge :</span>
                <span className="font-medium">{data.minAge} - {data.maxAge} ans</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Distance max :</span>
                <span className="font-medium">{data.maxDistance} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Type de relation :</span>
                <span className="font-medium">
                  {LOOKING_FOR_OPTIONS.find(l => l.value === data.lookingFor)?.label}
                </span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-xl">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              variant="gradient"
              size="lg"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Sauvegarde en cours...
                </>
              ) : (
                <>
                  Commencer à découvrir
                  <Heart className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // ================================
  // RENDU PRINCIPAL
  // ================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Étape {currentStep + 1} sur {STEPS.length}</span>
            <span>{Math.round(((currentStep + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Carte principale */}
        <Card className="p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          {STEPS[currentStep].id !== 'complete' && (
            <div className="flex justify-between mt-8">
              <Button
                onClick={prevStep}
                variant="outline"
                disabled={currentStep === 0}
                className={currentStep === 0 ? 'invisible' : ''}
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Retour
              </Button>

              <Button
                onClick={nextStep}
                variant="gradient"
                disabled={!isStepValid()}
                className={!isStepValid() ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {currentStep === STEPS.length - 2 ? 'Terminer' : 'Continuer'}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          )}
        </Card>

        {/* Skip optionnel pour les intérêts */}
        {STEPS[currentStep].id === 'interests' && (
          <button
            onClick={nextStep}
            className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm"
          >
            Passer cette étape
          </button>
        )}
      </div>
    </div>
  );
}
