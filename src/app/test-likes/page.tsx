"use client";
import { useState } from 'react';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const executeStep = async (stepNumber: number, url: string, method = 'GET', body = null) => {
    setLoading(true);
    setStep(stepNumber);
    
    try {
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }

      console.log(`🔄 Étape ${stepNumber}: ${method} ${url}`);
      
      const response = await fetch(url, options);
      const data = await response.json();
      
      setResult(data);
      console.log(`✅ Étape ${stepNumber} terminée:`, data);
      
      return data;
      
    } catch (error) {
      console.error(`❌ Erreur étape ${stepNumber}:`, error);
      setResult({ error: `Erreur étape ${stepNumber}: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const step1_CheckUsers = () => {
    executeStep(1, '/api/debug/all-users');
  };

  const step2_CreateLikes = () => {
    executeStep(2, '/api/debug/create-likes', 'POST', { createTestScenario: true });
  };

  const step3_CheckLikes = () => {
    executeStep(3, '/api/debug/likes-matches');
  };

  const step4_CreateMatches = () => {
    executeStep(4, '/api/debug/likes-matches', 'POST');
  };

  const step5_CheckFinalMatches = () => {
    executeStep(5, '/api/matches');
  };

  const runAllSteps = async () => {
    console.log('🚀 Exécution complète...');
    
    // Étape 1: Vérifier les utilisateurs
    const users = await executeStep(1, '/api/debug/all-users');
    if (!users || users.error) return;
    
    await new Promise(resolve => setTimeout(resolve, 500)); // Pause
    
    // Étape 2: Créer les likes
    const likes = await executeStep(2, '/api/debug/create-likes', 'POST', { createTestScenario: true });
    if (!likes || likes.error) return;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Étape 3: Vérifier les likes
    const likesStatus = await executeStep(3, '/api/debug/likes-matches');
    if (!likesStatus || likesStatus.error) return;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Étape 4: Créer les matches
    const matches = await executeStep(4, '/api/debug/likes-matches', 'POST');
    if (!matches || matches.error) return;
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Étape 5: Vérifier le résultat final
    await executeStep(5, '/api/matches');
    
    console.log('🎉 Processus terminé ! Tu peux maintenant tester le chat.');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            🧪 Créateur de Likes & Matches pour David Chen
          </h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
            <p className="text-blue-800">
              <strong>Objectif :</strong> Créer des interactions pour que David Chen ait des matches et puisse tester le chat.
            </p>
          </div>

          {/* Bouton automatique */}
          <div className="mb-6">
            <button
              onClick={runAllSteps}
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-lg disabled:opacity-50 text-lg"
            >
              {loading ? `⏳ Étape ${step} en cours...` : '🚀 EXÉCUTER TOUT AUTOMATIQUEMENT'}
            </button>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-4">Ou exécuter étape par étape :</h3>
            
            <div className="grid gap-3">
              <button
                onClick={step1_CheckUsers}
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                1️⃣ Vérifier les utilisateurs disponibles
              </button>
              
              <button
                onClick={step2_CreateLikes}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                2️⃣ Créer des likes bidirectionnels
              </button>
              
              <button
                onClick={step3_CheckLikes}
                disabled={loading}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                3️⃣ Vérifier les likes créés
              </button>
              
              <button
                onClick={step4_CreateMatches}
                disabled={loading}
                className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                4️⃣ Créer les matches automatiquement
              </button>
              
              <button
                onClick={step5_CheckFinalMatches}
                disabled={loading}
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
              >
                5️⃣ Vérifier les matches finaux
              </button>
            </div>
          </div>
        </div>

        {/* Résultats */}
        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              📊 Résultat - Étape {step}
            </h2>
            
            {result.error ? (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-800 font-medium">❌ Erreur :</p>
                <p className="text-red-600">{result.error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Résumé rapide selon l'étape */}
                {step === 1 && result.totalStats && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-4">
                    <p className="text-blue-800">
                      <strong>👥 {result.totalStats.totalUsers} utilisateur(s) trouvé(s)</strong>
                    </p>
                    <p className="text-blue-600">
                      Autres utilisateurs disponibles : {result.otherUsers?.length || 0}
                    </p>
                  </div>
                )}
                
                {step === 2 && result.summary && (
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <p className="text-red-800">
                      <strong>❤️ {result.summary.created} like(s) créé(s)</strong>
                    </p>
                    <p className="text-red-600">
                      Scénario : {result.summary.scenario}
                    </p>
                  </div>
                )}
                
                {step === 3 && result.stats && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                    <p className="text-yellow-800">
                      <strong>📊 Likes envoyés : {result.stats.sentLikes}</strong>
                    </p>
                    <p className="text-yellow-800">
                      <strong>📊 Likes reçus : {result.stats.receivedLikes}</strong>
                    </p>
                    <p className="text-yellow-800">
                      <strong>💕 Likes réciproques : {result.stats.reciprocalLikes}</strong>
                    </p>
                    <p className="text-yellow-800">
                      <strong>❌ Matches manquants : {result.stats.missingMatches}</strong>
                    </p>
                  </div>
                )}
                
                {step === 4 && result.summary && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-4">
                    <p className="text-purple-800">
                      <strong>🎯 {result.summary.created} match(es) créé(s)</strong>
                    </p>
                  </div>
                )}
                
                {step === 5 && result.matches && (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <p className="text-green-800">
                      <strong>✅ {result.matches.length} match(es) final(aux)</strong>
                    </p>
                    <p className="text-green-600">
                      David peut maintenant utiliser le chat !
                    </p>
                  </div>
                )}
                
                {/* Détails complets */}
                <details className="border rounded">
                  <summary className="bg-gray-100 p-3 cursor-pointer font-medium">
                    🔍 Voir les détails complets
                  </summary>
                  <div className="p-4">
                    <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </div>
        )}

        {/* Instructions finales */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-green-800 mb-2">🎯 Après avoir exécuté tout :</h3>
          <ol className="list-decimal list-inside space-y-1 text-green-700">
            <li>Va sur <code className="bg-green-100 px-1 rounded">/chat</code> avec David Chen</li>
            <li>Ouvre un autre navigateur et connecte-toi avec un autre utilisateur</li>
            <li>Teste l'envoi de messages en temps réel !</li>
            <li>Vérifie que les utilisateurs apparaissent comme "en ligne"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}