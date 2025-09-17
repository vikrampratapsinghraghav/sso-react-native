import React from "react";
import { View, Button, Alert, StyleSheet } from "react-native";
import * as Keychain from "react-native-keychain";

const FaceIDExample = () => {
  const saveData = async () => {
    try {
      await Keychain.setGenericPassword(
        "username",
        "my_secret_password",
        {
          service: "com.myapp.faceidtoken", // unique service name
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
          authenticationPrompt: {
            title: "Save with Face ID",
            subtitle: "Protect your data",
            description: "Use Face ID to secure the information",
          },
        }
      );
      Alert.alert("✅ Saved", "Data has been stored with Face ID protection");
    } catch (error) {
      Alert.alert("❌ Error", String(error));
    }
  };

  const retrieveData = async () => {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: "com.myapp.faceidtoken", // must match service
        authenticationPrompt: {
          title: "Authenticate with Face ID",
          subtitle: "Retrieve your secure data",
        },
      });

      if (credentials) {
        Alert.alert("🔓 Retrieved", `User: ${credentials.username}\nPass: ${credentials.password}`);
      } else {
        Alert.alert("⚠️ No Data", "Nothing stored yet");
      }
    } catch (error) {
      Alert.alert("❌ Error", String(error));
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Save Data" onPress={saveData} />
      <View style={{ marginVertical: 10 }} />
      <Button title="Retrieve Data (Face ID)" onPress={retrieveData} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
});

export default FaceIDExample;
