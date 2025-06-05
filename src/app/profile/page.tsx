'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import ProfileManager from '../../components/ProfileManager';

const ProfilePage: React.FC = () => {
  return (
    <SessionProvider>
      <div className="min-h-screen">
        <ProfileManager />
      </div>
    </SessionProvider>
  );
};

export default ProfilePage;