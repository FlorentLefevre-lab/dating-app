// src/components/layout/Navbar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HeartIcon, 
  ChatBubbleLeftRightIcon, 
  UserIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon 
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartSolid, 
  ChatBubbleLeftRightIcon as ChatSolid, 
  UserIcon as UserSolid,
  MagnifyingGlassIcon as SearchSolid,
  Cog6ToothIcon as CogSolid 
} from '@heroicons/react/24/solid';

const Navbar = () => {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/discover',
      label: 'Découvrir',
      icon: MagnifyingGlassIcon,
      activeIcon: SearchSolid,
      color: 'text-pink-500'
    },
    {
      href: '/matches',
      label: 'Matches',
      icon: HeartIcon,
      activeIcon: HeartSolid,
      color: 'text-red-500'
    },
    {
      href: '/chat',
      label: 'Messages',
      icon: ChatBubbleLeftRightIcon,
      activeIcon: ChatSolid,
      color: 'text-blue-500'
    },
    {
      href: '/profile',
      label: 'Profil',
      icon: UserIcon,
      activeIcon: UserSolid,
      color: 'text-purple-500'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = isActive ? item.activeIcon : item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? `${item.color} bg-gray-50 scale-110` 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className={`text-xs font-medium ${
                  isActive ? 'font-semibold' : ''
                }`}>
                  {item.label}
                </span>
                
                {/* Indicateur actif */}
                {isActive && (
                  <div className={`w-1 h-1 rounded-full ${item.color.replace('text-', 'bg-')} mt-1`} />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;