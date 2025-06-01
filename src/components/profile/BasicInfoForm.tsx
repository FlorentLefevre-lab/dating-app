// components/profile/BasicInfoForm.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { UserProfile } from '../../types/profiles';
import { PROFESSIONS } from '../../types/profiles';
import LocationAutocomplete from '../common/LocationAutoComplete';

const basicInfoSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  age: z.coerce.number().min(18, 'Âge minimum 18 ans').max(100, 'Âge maximum 100 ans').optional().nullable(),
  bio: z.string().max(500, 'Bio limitée à 500 caractères').optional().nullable(),
  location: z.string().max(100, 'Localisation trop longue').optional().nullable(),
  department: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  profession: z.string().optional().nullable()
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

interface Props {
  profile: UserProfile | null;
  loading: boolean;
  onSubmit: (data: BasicInfoFormData) => Promise<void>;
  onCancel: () => void;
}

const BasicInfoForm: React.FC<Props> = ({ profile, loading, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: '',
      age: null,
      bio: '',
      location: '',
      department: '',
      region: '',
      postcode: '',
      profession: ''
    }
  });

  const currentLocation = watch('location');

  useEffect(() => {
    if (profile) {
      console.log('📊 Chargement du profil existant:', profile);
      setValue('name', profile.name || '');
      setValue('age', profile.age);
      setValue('bio', profile.bio);
      setValue('location', profile.location);
      setValue('department', profile.department || '');
      setValue('region', profile.region || '');
      setValue('postcode', profile.postcode || '');
      setValue('profession', profile.profession || '');
      console.log('✅ Valeurs chargées dans le formulaire');
    }
  }, [profile, setValue]);

  const handleLocationChange = (locationData: any) => {
    console.log('🗺️ Nouvelle localisation sélectionnée:', locationData);
    console.log('📍 Avant setValue - Valeurs actuelles du formulaire:', {
      location: watch('location'),
      department: watch('department'),
      region: watch('region'),
      postcode: watch('postcode')
    });
    
    setValue('location', locationData.fullAddress);
    setValue('department', locationData.department);
    setValue('region', locationData.region);
    setValue('postcode', locationData.postcode);
    
    console.log('📝 Après setValue - Nouvelles valeurs:', {
      location: locationData.fullAddress,
      department: locationData.department,
      region: locationData.region,
      postcode: locationData.postcode
    });
    
    // Vérification immédiate
    setTimeout(() => {
      console.log('⏰ Vérification 100ms après setValue:', {
        location: watch('location'),
        department: watch('department'),
        region: watch('region'),
        postcode: watch('postcode')
      });
    }, 100);
  };

  const handleFormSubmit = async (data: BasicInfoFormData) => {
    console.log('📤 Données complètes du formulaire à sauvegarder:', data);
    try {
      await onSubmit(data);
      console.log('✅ Sauvegarde terminée');
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Informations de base
      </h2>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Nom complet *
            </label>
            <input
              {...register('name')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              placeholder="Votre nom complet"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Âge
            </label>
            <input
              type="number"
              min="18"
              max="100"
              {...register('age', { valueAsNumber: true })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              placeholder="Votre âge"
            />
            {errors.age && (
              <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Profession
          </label>
          <select
            {...register('profession')}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
          >
            <option value="">Sélectionnez votre profession</option>
            {PROFESSIONS.map(profession => (
              <option key={profession.value} value={profession.value}>
                {profession.label}
              </option>
            ))}
          </select>
          {errors.profession && (
            <p className="text-red-500 text-sm mt-1">{errors.profession.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Localisation
          </label>
          <LocationAutocomplete
            value={currentLocation || ''}
            onChange={handleLocationChange}
            placeholder="Tapez votre ville..."
          />
          {errors.location && (
            <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Bio
          </label>
          <textarea
            {...register('bio')}
            rows={4}
            maxLength={500}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
            placeholder="Parlez un peu de vous..."
          />
          {errors.bio && (
            <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>
          )}
        </div>

        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 px-4 rounded-lg hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 font-medium transition-all"
          >
            {loading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
          </motion.button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default BasicInfoForm;