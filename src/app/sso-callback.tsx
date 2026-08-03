import * as WebBrowser from 'expo-web-browser';

// Required so the OAuth browser session can close and hand control back to the app.
WebBrowser.maybeCompleteAuthSession();

export default function SSOCallback() {
  return null;
}
