# 📱 How to Install SAMAN on your Mobile Phone

I have "packed" this project for mobile using **Capacitor** and **PWA** technology. Here is how you get it onto your phone:

## Option 1: The Fast Way (Instant Install)
This is the easiest way and doesn't require any special software.
1. Make sure your phone and computer are on the same Wi-Fi.
2. Find your computer's IP address (run `ipconfig` in terminal).
3. Open Chrome (Android) or Safari (iPhone) on your phone and go to `http://YOUR_IP:8080`.
4. Tap **"Add to Home Screen"**. 
5. The app will install instantly with your logo and full-screen access.

## Option 2: The "Native File" Way (.apk / .ipa)
To generate a physical file you can send to others:
1. Open your terminal in this folder.
2. Run: `npm run build`
3. Run: `npx cap add android` (or `ios`)
4. Run: `npx cap open android` (This opens Android Studio).
5. In Android Studio, click **Build > Build APK**.
6. Your `.apk` file will be generated in `android/app/build/outputs/apk/debug/`.

---
**Note:** I have already added the **Bottom Navigation Bar** and **Mobile App Icons** to the code, so it will look like a professional native app the moment you open it!
