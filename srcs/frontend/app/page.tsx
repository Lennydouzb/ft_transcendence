//@TODO genere par ia pour les tests du docker faudra tout changer;(


'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [backendStatus, setBackendStatus] = useState('En attente du backend...');
  const [dbStatus, setDbStatus] = useState('En attente de la base de données...');
  const [dbData, setDbData] = useState<any>(null);

  useEffect(() => {
    // Test du Backend Node.js
    async function testerBackend() {
      try {
        const reponse = await fetch('/api/test');
        if (!reponse.ok) throw new Error(`Erreur HTTP: ${reponse.status}`);
        setBackendStatus('✅ Backend Node.js en ligne');
      } catch (erreur: any) {
        setBackendStatus(`❌ Échec Backend : ${erreur.message}`);
      }
    }

    // Test de la Base de données MariaDB
    async function testerBaseDeDonnees() {
      try {
        const reponse = await fetch('/api/test-db');
        const data = await reponse.json();
        
        if (!reponse.ok || !data.success) {
          throw new Error(data.error || `Erreur HTTP: ${reponse.status}`);
        }

        setDbStatus('✅ Base de données MariaDB connectée');
        setDbData(data);
      } catch (erreur: any) {
        setDbStatus(`❌ Échec BDD : ${erreur.message}`);
      }
    }

    testerBackend();
    testerBaseDeDonnees();
  }, []);

  return (
    <main style={{ padding: '3rem', fontFamily: 'system-ui', backgroundColor: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
      <h1>Dashboard ft_transcendence</h1>
      
      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        {/* Encart Backend */}
        <div style={{ flex: 1, padding: '1.5rem', borderRadius: '8px', backgroundColor: '#2a2a2a' }}>
          <h3>Statut API</h3>
          <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{backendStatus}</p>
        </div>

        {/* Encart Base de données */}
        <div style={{ flex: 1, padding: '1.5rem', borderRadius: '8px', backgroundColor: '#2a2a2a' }}>
          <h3>Statut BDD</h3>
          <p style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{dbStatus}</p>
        </div>
      </div>

      {dbData && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #38bdf8' }}>
          <h3>Détails du retour MariaDB :</h3>
          <pre style={{ color: '#38bdf8' }}>{JSON.stringify(dbData, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}
