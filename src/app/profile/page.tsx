// app/profile/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';import ProfileManager from '../../components/ProfileManager';

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/signin'); // Ajustez selon votre page de connexion
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileManager />
    </div>
  );
}