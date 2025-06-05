// src/app/dashboard/page.tsx
import { auth } from '../../auth'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  console.log('🔍 Dashboard page: Démarrage du rendu côté serveur')
  
  const session = await auth()
  console.log('🔍 Dashboard page: Session récupérée:', session ? 'Connecté' : 'Non connecté')
  
  if (!session) {
    console.log('🔄 Dashboard page: Pas de session, redirection vers login')
    redirect('/auth/login')
  }

  const userName = session.user?.name || session.user?.email || 'Utilisateur'
  console.log('🔍 Dashboard page: Nom utilisateur:', userName)

  return (
    <div>
      <DashboardClient session={session} userName={userName} />
    </div>
  )
}