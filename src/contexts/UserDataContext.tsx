import React, { createContext, useContext } from 'react';
import { useUserData } from '../hooks/useUserData';

const UserDataContext = createContext<ReturnType<typeof useUserData> | undefined>(undefined);

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const userData = useUserData();

  return (
    <UserDataContext.Provider value={userData}>
      {userData.loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-300"></div>
        </div>
      ) : (
        children
      )}
    </UserDataContext.Provider>
  );
}

export function useUserDataContext() {
  const context = useContext(UserDataContext);
  if (context === undefined) {
    throw new Error('useUserDataContext must be used within a UserDataProvider');
  }
  return context;
}