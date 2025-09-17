import React, { useState, useEffect } from "react";
import { SafeAreaView, Button, Text } from "react-native";
import PublicClientApplication from "react-native-msal";

const pca = new PublicClientApplication({
  auth: {
    clientId: "bba519e0-a2f9-4301-8233-4a687de92607", // from your screenshot
    redirectUri: "msauth.com.microsoftlogin.MicrosoftLogin://auth",
    authority: "https://login.microsoftonline.com/6171e1a1-b822-451c-b9bb-e6e35d88b0db",
  },
});

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        await pca.init();
        setIsInitialized(true);
      } catch (error) {
        console.log("MSAL initialization failed:", error);
      }
    };
    
    initializeMsal();
  }, []);

  const signIn = async () => {
    if (!isInitialized) {
      console.log("MSAL not initialized yet");
      return;
    }

    try {
      const result = await pca.acquireToken({
        scopes: ["User.Read"], // basic Graph API scope
      });
      
      if (result && result.account) {
        setUser(result.account);
      }
    } catch (error) {
      console.log("Login failed:", error);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      {user ? (
        <Text>Welcome {user.username}</Text>
      ) : (
        <Button 
          title="Login with Microsoft" 
          onPress={signIn}
          disabled={!isInitialized}
        />
      )}
    </SafeAreaView>
  );
}
