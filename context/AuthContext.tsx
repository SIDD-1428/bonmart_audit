import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import React, { createContext, useContext, useState } from "react";

type AuthContextType = {
  confirmation: FirebaseAuthTypes.ConfirmationResult | null;
  setConfirmation: React.Dispatch<
    React.SetStateAction<FirebaseAuthTypes.ConfirmationResult | null>
  >;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [confirmation, setConfirmation] =
    useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

  return (
    <AuthContext.Provider value={{ confirmation, setConfirmation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuthContext must be used inside AuthProvider");
  }

  return context;
}