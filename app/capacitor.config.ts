import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'it.pierson.avlfield',
  appName: 'AVL Field',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Test builds talk to a laptop over plain http and open its sign-in page in the app.
    cleartext: true,
    allowNavigation: ['*'],
  },
  plugins: {
    // Native HTTP: no CORS, and J2's session cookie is shared with the sign-in page.
    CapacitorHttp: { enabled: true },
    CapacitorCookies: { enabled: true },
  },
}

export default config
