import React, { useState, useEffect } from "react";
import { SafeAreaView, Button, Text, View, StyleSheet, Alert } from "react-native";
import PublicClientApplication from "react-native-msal";
import * as Keychain from 'react-native-keychain';
import FaceIDExample from "./FaceIDExample";

// Your original configurations
const myConfig = {
  clientId: "799cc90e-7337-4fc8-8340-2a4d260e263f",
  redirectUri: "msauth.org.reactjs.native.example.MicrosoftLogin://auth",
  authority: "https://login.microsoftonline.com/common",
};

const adcbConfig = {
  clientId: "bba519e0-a2f9-4301-8233-4a687de92607",
  redirectUri: "msauth.org.reactjs.native.example.MicrosoftLogin://auth",
  authority: "https://login.microsoftonline.com/6171e1a1-b822-451c-b9bb-e6e35d88b0db",
}

// Keychain constants
const KEYCHAIN_SERVICE = 'MicrosoftLogin';
const KEYCHAIN_ACCOUNT = 'user_auth_data';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentConfig, setCurrentConfig] = useState('myConfig');
  const [pca, setPca] = useState<any>(null);




  useEffect(() => {
    const initializeApp = async () => {
      try {
        // First, try to load user from keychain to determine which config to use
        const savedUser = await loadUserFromKeychain();

        // If user exists in keychain, use the config they were logged in with
        if (savedUser && savedUser.configUsed) {
          setCurrentConfig(savedUser.configUsed);
          setUser(savedUser);
        }

        // Initialize MSAL with the appropriate config
        const configToUse = savedUser?.configUsed === 'adcbConfig' ? adcbConfig : myConfig;
        const newPca = new PublicClientApplication({
          auth: configToUse,
        });

        await newPca.init();
        setPca(newPca);
        setIsInitialized(true);
        console.log("MSAL initialized successfully with", savedUser?.configUsed || 'myConfig');

      } catch (error) {
        console.log("MSAL initialization failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const switchConfig = async (configName: string) => {
    if (configName === currentConfig) return;

    setIsLoading(true);
    try {
      // Clear current user and keychain
      await clearKeychain();
      setUser(null);

      // Switch configuration
      setCurrentConfig(configName);

      // Reinitialize MSAL with new config
      const configToUse = configName === 'adcbConfig' ? adcbConfig : myConfig;
      const newPca = new PublicClientApplication({
        auth: configToUse,
      });

      await newPca.init();
      setPca(newPca);
      setIsInitialized(true);

      console.log("Switched to", configName);
    } catch (error) {
      console.log("Error switching config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserFromKeychain = async () => {
    console.log("🔍 Attempting to load user from keychain...");
    try {
      const creds = await Keychain.getGenericPassword({
        service: "com.microsoftlogin.token",
        authenticationPrompt: {
          title: "Unlock with Face ID",
        },
      });

      if (creds) {
        console.log("Face ID prompt should appear now..."); console.log("User fetched:", JSON.parse(creds.password));
        return JSON.parse(creds.password);
      }

      return null;
    } catch (error) {
      console.log("Error fetching keychain data:", error);
      return null;
    }
  };

  const saveUserToKeychain = async (userData: any) => {
    try {
      await Keychain.setGenericPassword(
        "user", // username (not important, can be static)
        JSON.stringify(userData),
        {
          service: "com.microsoftlogin.token", // keep consistent
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          authenticationPrompt: {
            title: "Save with Face ID",
            subtitle: "Protect your Microsoft login",
            description: "Use Face ID to secure your authentication data",
          },

          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
        }
      );
      console.log("🔒 User data saved to keychain with Face ID protection");
    } catch (error) {
      console.log("Error saving user to keychain:", error);
    }
  };

  const clearKeychain = async () => {
    try {
      const cleared = await Keychain.resetGenericPassword({
        service: "com.microsoftlogin.token",
      });
      console.log(cleared ? "Keychain cleared" : "No keychain entry found");
    } catch (error) {
      console.log("Error clearing keychain:", error);
    }
  };



  const callOBO = async () => {
    try {
      const response = await fetch("http://localhost:4000/obo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: user?.accessToken }),
      });

      const data = await response.json();
      Alert.alert("OBO Result", JSON.stringify(data, null, 2));

    } catch (err) {
      console.error("OBO call failed:", err);
    }
  };

  

  const signIn = async () => {
    if (!isInitialized || !pca) {
      console.log("MSAL not initialized yet");
      return;
    }

    try {
      const result = await pca.acquireToken({
        scopes: ["User.Read"],
      });

      if (result && result.account) {
        console.log("Login successful:", result);

        // Store complete result data in keychain
        const userData = {
          account: result.account,
          accessToken: result.accessToken,
          idToken: result.idToken,
          scopes: result.scopes,
          expiresOn: result.expiresOn,
          tenantId: result.tenantId,
          configUsed: currentConfig,
          loginTime: new Date().toISOString()
        };

        setUser(userData);
        await saveUserToKeychain(userData);
      }
    } catch (error) {
      console.log("Login failed:", error);
    }
  };

  const signOut = async () => {
    try {
      if (user && pca) {
        // Sign out from MSAL
        await pca.removeAccount(user.account);
      }

      // Clear keychain
      await clearKeychain();

      // Clear local state
      setUser(null);

      console.log("User signed out successfully");
    } catch (error) {
      console.log("Sign out failed:", error);
      // Even if MSAL signout fails, clear local data
      await clearKeychain();
      setUser(null);
    }
  };




  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  // return(
  //   <FaceIDExample />
  // )

  return (
    <SafeAreaView style={styles.container}>
      {/* Configuration Switcher */}
      <View style={styles.configSwitcher}>
        <Text style={styles.configTitle}>Select Configuration:</Text>
        <View style={styles.configButtons}>
          <Button
            title="My Config"
            onPress={() => switchConfig('myConfig')}
            color={currentConfig === 'myConfig' ? '#1976d2' : '#666'}
          />
          <Button
            title="ADCB Config"
            onPress={() => switchConfig('adcbConfig')}
            color={currentConfig === 'adcbConfig' ? '#1976d2' : '#666'}
          />
        </View>
        <Text style={styles.currentConfig}>Current: {currentConfig}</Text>
      </View>

      {user ? (
        <View style={styles.userContainer}>
          <Text style={styles.welcomeText}>Welcome Back!</Text>
          <Text style={styles.userText}>Name: {user?.account?.claims?.name || "N/A"}</Text>
          <Text style={styles.userText}>Email: {user?.account?.username || 'N/A'}</Text>
          <Text style={styles.userText}>Config Used: {user?.configUsed}</Text>
          <Text style={styles.userText}>Login Time: {new Date(user.loginTime).toLocaleString()}</Text>
          <Text style={styles.userText}>Token Expires: {user.expiresOn ? new Date(user.expiresOn).toLocaleString() : 'N/A'}</Text>

          <View style={styles.buttonContainer}>
            <Button
              title="Sign Out"
              onPress={signOut}
              color="#d32f2f"
            />

            <Button
              title="Test Face ID"
              onPress={async () => {
                try {
                  const creds = await Keychain.getGenericPassword({
                    service: "com.microsoftlogin.token",
                    authenticationPrompt: { title: "Unlock with Face ID" },
                  });
                  if (creds) {
                    console.log("✅ Unlocked:", creds);
                  } else {
                    console.log("⚠️ No credentials found");
                  }
                } catch (e) {
                  console.log("❌ Face ID failed:", e);
                }
              }}
            />

            <Button
              title="Call OBO"
              onPress={callOBO}
              color="#1976d2"
            />
          </View>
        </View>
      ) : (
        <View style={styles.loginContainer}>
          <Text style={styles.title}>Microsoft Login Demo</Text>
          <Text style={styles.configInfo}>Using: {currentConfig}</Text>
          <Button
            title="Login with Microsoft"
            onPress={signIn}
            disabled={!isInitialized}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  configSwitcher: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  configButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  currentConfig: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  userContainer: {
    alignItems: "center",
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 300,
    marginTop: 100,
  },
  loginContainer: {
    alignItems: "center",
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 300,
    marginTop: 100,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  configInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1976d2',
  },
  userText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    marginTop: 20,
    width: '100%',
  },
});
