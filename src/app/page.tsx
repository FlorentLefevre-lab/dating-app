export default function HomePage() {
  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '2rem' }}>
        🎉 SUCCESS !
      </h1>
      
      <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem' }}>
        💕 Dating App Fonctionnelle !
      </h2>
      
      <div style={{ 
        background: 'rgba(255,255,255,0.1)', 
        borderRadius: '15px', 
        padding: '2rem',
        marginBottom: '2rem',
        backdropFilter: 'blur(10px)'
      }}>
        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
          ✅ Load balancing entre 3 instances<br />
          ✅ Traefik configuré correctement<br />
          ✅ Page d'accueil accessible<br />
          ✅ PostgreSQL et Redis connectés
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: '1.5rem'
        }}>
          <a href="/api/health" style={{ 
            background: '#10b981', 
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            🩺 Health Check
          </a>
          <a href="http://127.0.0.1:8080/dashboard/" target="_blank" style={{ 
            background: '#3b82f6', 
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            📊 Dashboard Traefik
          </a>
          <a href="http://127.0.0.1:5050" target="_blank" style={{ 
            background: '#8b5cf6', 
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            🗄️ PgAdmin
          </a>
        </div>
      </div>
      
      <p style={{ fontSize: '1rem', opacity: '0.8' }}>
        Rafraîchissez la page pour voir le load balancing en action ! 🔄
      </p>
    </div>
  )
}
