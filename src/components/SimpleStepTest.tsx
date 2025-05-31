'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function SimpleStepTest() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<string[]>([]);

  const log = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearLogs = () => {
    setLogs([]);
    console.clear();
  };

  // ÉTAPE 1: Test des variables d'environnement
  const testStep1 = () => {
    clearLogs();
    log('=== ÉTAPE 1: Variables d\'environnement ===');
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    log(`Cloud Name: ${cloudName || 'UNDEFINED ❌'}`);
    log(`Upload Preset: ${uploadPreset || 'UNDEFINED ❌'}`);
    
    if (!cloudName || !uploadPreset) {
      log('❌ PROBLÈME: Variables d\'environnement manquantes!');
      log('✅ SOLUTION: Configurez votre .env.local');
      return false;
    }
    
    log('✅ Variables OK');
    return true;
  };

  // ÉTAPE 2: Test API seule (sans Cloudinary)
  const testStep2 = async () => {
    log('=== ÉTAPE 2: Test API directe ===');
    
    const testData = {
      imageUrl: 'https://via.placeholder.com/300x300.jpg?text=TEST_API'
    };
    
    log(`Données à envoyer: ${JSON.stringify(testData)}`);
    
    try {
      const response = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      const responseData = await response.json();
      
      log(`Réponse API status: ${response.status}`);
      log(`Réponse API data: ${JSON.stringify(responseData)}`);
      
      if (response.ok) {
        log('✅ API fonctionne correctement!');
        return true;
      } else {
        log('❌ PROBLÈME avec l\'API');
        return false;
      }
    } catch (error) {
      log(`❌ ERREUR API: ${error.message}`);
      return false;
    }
  };

  // ÉTAPE 3: Test Cloudinary seul
  const testStep3 = async () => {
    log('=== ÉTAPE 3: Test Cloudinary seul ===');
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset) {
      log('❌ Variables manquantes, impossible de tester Cloudinary');
      return false;
    }
    
    // Créer une image de test (pixel transparent)
    const testImageBlob = await fetch('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==')
      .then(r => r.blob());
    
    const formData = new FormData();
    formData.append('file', testImageBlob, 'test.png');
    formData.append('upload_preset', uploadPreset);
    
    log('FormData créé pour test Cloudinary');
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      const data = await response.json();
      
      log(`Cloudinary status: ${response.status}`);
      
      if (response.ok) {
        log(`✅ Cloudinary OK! URL: ${data.secure_url}`);
        return data.secure_url;
      } else {
        log(`❌ ERREUR Cloudinary: ${JSON.stringify(data)}`);
        return false;
      }
    } catch (error) {
      log(`❌ ERREUR réseau Cloudinary: ${error.message}`);
      return false;
    }
  };

  // ÉTAPE 4: Test complet avec vraie image
  const testStep4 = async (file: File) => {
    log('=== ÉTAPE 4: Test complet ===');
    
    // Sous-étape 4.1: Upload Cloudinary
    log('4.1: Upload vers Cloudinary...');
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    
    try {
      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      const cloudinaryData = await cloudinaryResponse.json();
      
      if (!cloudinaryResponse.ok) {
        log(`❌ Échec Cloudinary: ${JSON.stringify(cloudinaryData)}`);
        return;
      }
      
      log(`✅ Cloudinary OK: ${cloudinaryData.secure_url}`);
      
      // Sous-étape 4.2: Envoi vers API
      log('4.2: Envoi vers API...');
      
      const apiData = {
        imageUrl: cloudinaryData.secure_url
      };
      
      log(`Données pour API: ${JSON.stringify(apiData)}`);
      
      const apiResponse = await fetch('/api/profile/photos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData)
      });
      
      const apiResponseData = await apiResponse.json();
      
      log(`API Response status: ${apiResponse.status}`);
      log(`API Response data: ${JSON.stringify(apiResponseData)}`);
      
      if (apiResponse.ok) {
        log('🎉 SUCCÈS COMPLET!');
      } else {
        log('❌ Échec API finale');
      }
      
    } catch (error) {
      log(`❌ ERREUR étape 4: ${error.message}`);
    }
  };

  if (!session) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700">Veuillez vous connecter pour tester l'upload</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">🔧 Test Debug Simple</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={testStep1}
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 text-left"
        >
          <span className="font-bold">Étape 1:</span> Vérifier variables d'environnement
        </button>
        
        <button
          onClick={testStep2}
          className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600 text-left"
        >
          <span className="font-bold">Étape 2:</span> Tester API seule (sans Cloudinary)
        </button>
        
        <button
          onClick={testStep3}
          className="w-full bg-orange-500 text-white p-3 rounded hover:bg-orange-600 text-left"
        >
          <span className="font-bold">Étape 3:</span> Tester Cloudinary seul
        </button>
        
        <div>
          <label className="block font-bold text-gray-700 mb-2">
            Étape 4: Test complet avec votre image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                log(`Fichier sélectionné: ${file.name} (${(file.size/1024/1024).toFixed(2)} MB)`);
                testStep4(file);
              }
            }}
            className="w-full border p-2 rounded"
          />
        </div>
      </div>

      {/* Logs */}
      <div className="bg-gray-50 border rounded p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold">Logs de debug:</h3>
          <button 
            onClick={clearLogs}
            className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300"
          >
            Effacer
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-gray-500 italic">Lancez une étape pour voir les logs...</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Instructions urgentes */}
      <div className="mt-6 bg-yellow-50 border border-yellow-300 rounded p-4">
        <h4 className="font-bold text-yellow-800 mb-2">⚠️ Si Étape 1 échoue:</h4>
        <div className="text-sm text-yellow-700 space-y-1">
          <p><strong>1.</strong> Créez/vérifiez votre fichier <code>.env.local</code> à la racine :</p>
          <pre className="bg-gray-100 p-2 rounded text-xs">
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dnxp931xb
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=dating_app_photos
          </pre>
          <p><strong>2.</strong> Redémarrez votre serveur : <code>npm run dev</code></p>
          <p><strong>3.</strong> Créez l'upload preset "dating_app_photos" en mode <strong>Unsigned</strong> sur cloudinary.com</p>
        </div>
      </div>
    </div>
  );
}