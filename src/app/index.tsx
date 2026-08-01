import { useAuth } from '@clerk/expo';
import { Redirect, type Href } from 'expo-router';

import { LoadingState } from '@/components/ui';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return <LoadingState />;
  if (isSignedIn) return <Redirect href={'/(app)' as Href} />;
  return <Redirect href={'/sign-in' as Href} />;
}
