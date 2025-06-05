// src/app/auth/login/page.tsx
import LoginForm from '@/components/auth/LoginForm'
import { auth } from '../../../auth'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const session = await auth() 
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connexion à votre compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <a
              href="/auth/register"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              créez un nouveau compte
            </a>
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}