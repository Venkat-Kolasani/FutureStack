import { useCallback, useLayoutEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { setAuthTokenGetter } from '../services/api';

export const useAuthToken = () => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const tokenGetter = useCallback(async () => {
    if (!isSignedIn) return null;
    return await getToken();
  }, [isSignedIn, getToken]);

  useLayoutEffect(() => {
    if (isLoaded) {
      setAuthTokenGetter(tokenGetter);
    }
    return () => {
      setAuthTokenGetter(null);
    };
  }, [isLoaded, tokenGetter]);

  return { isLoaded, isSignedIn };
};

export default useAuthToken;
