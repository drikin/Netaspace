import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  username: string;
}

interface AuthResponse {
  user: AuthUser;
}

export function useAuth() {
  const { data: authData, isLoading, error, refetch } = useQuery<AuthResponse | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always consider stale to ensure fresh data
  });

  // Extract user from response
  const user = authData?.user;
  const isAuthenticated = !!user && !error;
  const isAdmin = user?.username === 'admin';

  return {
    user,
    authData,
    isLoading,
    isAuthenticated,
    isAdmin,
    refetch,
  };
}