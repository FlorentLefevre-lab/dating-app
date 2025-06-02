import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Menu, X, Home, User, Heart, MessageCircle, Settings, LogOut, Bell } from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      // Supprimer tous les cookies de session
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        document.cookie = name.trim() + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
      });

      // Supprimer les données du localStorage si utilisées
      localStorage.clear();
      sessionStorage.clear();

      // Déconnexion via next-auth avec redirection forcée
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      });

      // Force un rechargement complet de la page pour s'assurer que tout est nettoyé
      window.location.href = '/';
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      // En cas d'erreur, forcer quand même la redirection
      window.location.href = '/';
    }
  };

  // Menu items pour utilisateurs connectés
  const authenticatedMenuItems = [
    { name: 'Accueil', href: '/', icon: Home },
    { name: 'Dashboard', href: '/dashboard', icon: Heart },
    { name: 'Messages', href: '/messages', icon: MessageCircle },
    { name: 'Profil', href: '/profile', icon: User },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Paramètres', href: '/settings', icon: Settings },
  ];

  // Menu items pour utilisateurs non connectés
  const publicMenuItems = [
    { name: 'Accueil', href: '/', icon: Home },
    { name: 'Fonctionnalités', href: '#features', icon: Heart },
  ];

  const menuItems = session ? authenticatedMenuItems : publicMenuItems;

  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-pink-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo et titre */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push('/')}>
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">💖</span>
              </div>
            </div>
            <div className="hidden md:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Flow Dating
              </h1>
            </div>
          </div>

          {/* Menu desktop */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-pink-600 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 transition-all duration-200 ease-in-out group"
                  >
                    <IconComponent size={18} className="group-hover:scale-110 transition-transform" />
                    <span>{item.name}</span>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Boutons d'action desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {session ? (
              <>
                <div className="flex items-center space-x-3 px-3 py-1.5 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
                  <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700 font-medium">
                    {session.user?.name || 'Utilisateur'}
                  </span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <LogOut size={16} />
                  <span>Déconnexion</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => router.push('/auth/login')}
                  className="px-4 py-2 text-gray-700 hover:text-pink-600 font-medium transition-colors duration-200"
                >
                  Se connecter
                </button>
                <button 
                  onClick={() => router.push('/auth/register')}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Heart size={16} />
                  <span>S'inscrire</span>
                </button>
              </div>
            )}
          </div>

          {/* Bouton menu mobile */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 rounded-lg text-gray-600 hover:text-pink-600 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all duration-200"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      <div className={`md:hidden transition-all duration-300 ease-in-out ${
        isMenuOpen 
          ? 'max-h-screen opacity-100 visible' 
          : 'max-h-0 opacity-0 invisible'
      } overflow-hidden`}>
        <div className="px-4 pt-2 pb-4 space-y-2 bg-gradient-to-br from-pink-50/80 to-purple-50/80 backdrop-blur-sm border-t border-pink-100">
          {session && (
            <div className="flex items-center space-x-3 px-3 py-3 mb-3 bg-white/70 rounded-lg border border-pink-200">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <div className="font-medium text-gray-800">
                  {session.user?.name || 'Utilisateur'}
                </div>
                <div className="text-sm text-gray-600">
                  {session.user?.email}
                </div>
              </div>
            </div>
          )}

          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-pink-600 hover:bg-white/80 transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                <IconComponent size={20} />
                <span>{item.name}</span>
              </a>
            );
          })}

          {session ? (
            <div className="border-t border-pink-200 pt-3 mt-3">
              <button 
                onClick={() => {
                  handleSignOut();
                  setIsMenuOpen(false);
                }}
                className="flex items-center space-x-3 w-full px-3 py-3 text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
              >
                <LogOut size={20} />
                <span>Déconnexion</span>
              </button>
            </div>
          ) : (
            <div className="border-t border-pink-200 pt-3 mt-3 space-y-2">
              <button 
                onClick={() => {
                  router.push('/auth/login');
                  setIsMenuOpen(false);
                }}
                className="w-full px-3 py-3 text-base font-medium text-gray-700 hover:text-pink-600 hover:bg-white/80 rounded-lg transition-all duration-200"
              >
                Se connecter
              </button>
              <button 
                onClick={() => {
                  router.push('/auth/register');
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-center space-x-2 w-full px-3 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200"
              >
                <Heart size={18} />
                <span>S'inscrire</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;