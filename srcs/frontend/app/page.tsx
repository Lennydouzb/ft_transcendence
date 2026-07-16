'use client';
//@TODO AI GENERATED FOR TESTS PURPOSES
import { useState } from 'react';
import * as api from './api/api';

export default function TestAPI() {
  const [resultat, setResultat] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [endpointActuel, setEndpointActuel] = useState<string>('');
  
  // On stocke le token ET les IDs générés pour que les requêtes s'enchaînent sans erreur SQL
  const [token, setToken] = useState<string>('');
  const [lastUserId, setLastUserId] = useState<number>(1);
  const [lastGameId, setLastGameId] = useState<number>(1);
  const [lastProjectId, setLastProjectId] = useState<number>(1);

  // Fonction générique pour gérer les appels, les chargements et les erreurs
  const executerTest = async (nomEndpoint: string, fonctionApi: () => Promise<any>) => {
    setLoading(true);
    setEndpointActuel(nomEndpoint);
    setResultat(null);
    try {
      const data = await fonctionApi();
      setResultat({ success: true, data });
      
      // 1. Sauvegarde automatique du token (marche pour Login ET CreateUser)
      if (data?.token) {
        setToken(data.token);
      }
      
      // 2. Sauvegarde automatique des IDs générés par MariaDB (AUTO_INCREMENT)
      if (nomEndpoint === 'Create User' && data?.idUser) setLastUserId(data.idUser);
      if (nomEndpoint === 'Create Game' && data?.idGame) setLastGameId(data.idGame);
      if (nomEndpoint === 'Create Project' && data?.idProject) setLastProjectId(data.idProject);
      
    } catch (erreur: any) {
      setResultat({ success: false, error: erreur.message || "Erreur inconnue" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui', backgroundColor: '#111827', color: '#f3f4f6', minHeight: '100vh', display: 'flex', gap: '2rem' }}>
      
      {/* Panneau de gauche : Les boutons d'action */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '90vh', overflowY: 'auto', paddingRight: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#3b82f6' }}>🛠️ Testeur d'API (Dynamique)</h1>
        
        <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#9ca3af' }}>1. Routes GET (Basiques)</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button style={btnStyle} onClick={() => executerTest('GET Users', api.fetchUsers)}>Users</button>
            <button style={btnStyle} onClick={() => executerTest('GET Games', api.fetchGames)}>Games</button>
            <button style={btnStyle} onClick={() => executerTest('GET Projects', api.fetchProjects)}>Projects</button>
          </div>
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#9ca3af' }}>2. Authentification</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* On génère un mail aléatoire pour éviter l'erreur UNIQUE(mail) si on clique plusieurs fois */}
            <button style={btnStyle} onClick={() => executerTest('Create User', () => api.fetchCreateUser('TestUser', 'pass123', `test_${Math.floor(Math.random() * 1000)}@mail.com`))}>
              Créer un Utilisateur
            </button>
            <button style={{...btnStyle, backgroundColor: '#059669'}} onClick={() => executerTest('Login', () => api.fetchLogin('test@mail.com', 'pass123'))}>
              Login Manuel
            </button>
          </div>
          {token && <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#10b981', wordBreak: 'break-all' }}>Token actif : {token.substring(0, 20)}...</p>}
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#9ca3af' }}>3. Données liées (Auto-actualisées)</h2>
          <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.5rem' }}>Utilise automatiquement le Game {lastGameId} et User {lastUserId}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button style={btnStyle} onClick={() => executerTest(`Game Participants (id:${lastGameId})`, () => api.fetchParticipants(lastGameId))}>Participants (Game {lastGameId})</button>
            <button style={btnStyle} onClick={() => executerTest(`User Games (id:${lastUserId})`, () => api.fetchUserGames(lastUserId))}>Jeux de l'User {lastUserId}</button>
            <button style={btnStyle} onClick={() => executerTest(`Game Projects (id:${lastGameId})`, () => api.fetchGameProjects(lastGameId))}>Projets du Game {lastGameId}</button>
          </div>
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '1rem', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#9ca3af' }}>4. Routes Protégées (Nécessitent un Token)</h2>
          {!token && <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>⚠️ Crée un utilisateur ou connecte-toi d'abord !</p>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', opacity: token ? 1 : 0.5, pointerEvents: token ? 'auto' : 'none' }}>
            
            <button style={btnStyleProt} onClick={() => executerTest('Create Game', () => api.fetchCreateGame('Partie de Pong Finale', token))}>Create Game</button>
            <button style={btnStyleProt} onClick={() => executerTest('Create Project', () => api.fetchCreateProject('https://github.com', 'ft_transcendence', token))}>Create Project</button>
            
            <button style={{...btnStyleProt, backgroundColor: '#ea580c'}} onClick={() => executerTest('Create Questions', () => api.fetchcreateQuestions([lastProjectId], lastGameId, token))}>
              Create Questions (Game {lastGameId}, Proj {lastProjectId})
            </button>
            <button style={{...btnStyleProt, backgroundColor: '#ea580c'}} onClick={() => executerTest('Create Participants', () => api.fetchCreateParticipants([lastUserId], lastGameId, token))}>
              Create Participants (Game {lastGameId}, User {lastUserId})
            </button>
            
            <button style={{...btnStyleProt, backgroundColor: '#be123c'}} onClick={() => executerTest('Update Name', () => api.fetchUpdateUserName('NouveauNom', token))}>Update Name</button>
            <button style={{...btnStyleProt, backgroundColor: '#be123c'}} onClick={() => executerTest('Delete Image', () => api.fetchDeleteUserImage(token))}>Delete Image</button>
          </div>
        </div>

      </div>

      {/* Panneau de droite : L'affichage des résultats */}
      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: '#1f2937', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', backgroundColor: '#374151', borderBottom: '1px solid #4b5563', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Résultat {endpointActuel && `> ${endpointActuel}`}</h3>
          {loading && <span style={{ color: '#60a5fa' }}>⏳ Chargement...</span>}
        </div>
        
        <div style={{ padding: '1rem', flex: '1', overflowY: 'auto' }}>
          {!resultat && !loading && <p style={{ color: '#9ca3af' }}>Clique sur un bouton à gauche pour tester un endpoint.</p>}
          
          {resultat && (
            <pre style={{ 
              backgroundColor: '#111827', 
              padding: '1rem', 
              borderRadius: '6px', 
              color: resultat.success ? '#34d399' : '#f87171',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}>
              {JSON.stringify(resultat.data || resultat.error, null, 2)}
            </pre>
          )}
        </div>
      </div>

    </main>
  );
}

// Styles pour garder le code HTML propre
const btnStyle = {
  padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', flex: '1 1 auto'
};
const btnStyleProt = {
  ...btnStyle, backgroundColor: '#8b5cf6'
};
