import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NavigationContextType {
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  confirmNavigation: () => boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [isDirty, setIsDirty] = useState(false);

  const confirmNavigation = () => {
    if (isDirty) {
      return window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
    }
    return true;
  };

  const value = {
    isDirty,
    setIsDirty,
    confirmNavigation,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};
