import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: number;
  username: string;
}

interface AuthResponse {
  user: AuthUser;
}

export function useAuth() {
  const { data: authData, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Extract user from response
  const user = authData?.user;
  const isAuthenticated = !!user && !error;
  const isAdmin = user?.username === 'admin';

  return {
    user: authData,
    isLoading,
    isAuthenticated,
    isAdmin,
  };
}