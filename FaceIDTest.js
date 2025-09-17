import * as Keychain from 'react-native-keychain';

export const testFaceID = async () => {
  try {
    console.log("🧪 Testing Face ID...");
    
    // Save with Face ID
    await Keychain.setGenericPassword(
      "test",
      "test-data",
      {
        service: "faceid-test",
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
        authenticationPrompt: {
          title: "Test Face ID Save",
        },
      }
    );
    console.log("✅ Saved with Face ID");
    
    // Load with Face ID
    const result = await Keychain.getGenericPassword({
      service: "faceid-test",
      authenticationPrompt: {
        title: "Test Face ID Load",
      },
    });
    
    if (result) {
      console.log("✅ Face ID test successful!");
    }
    
  } catch (error) {
    console.log("❌ Face ID test failed:", error);
  }
};
