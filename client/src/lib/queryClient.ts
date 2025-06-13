import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorData;
    try {
      const text = await res.text();
      errorData = JSON.parse(text);
    } catch {
      errorData = { message: res.statusText };
    }
    
    const error = new Error(`${res.status}: ${errorData.message || res.statusText}`);
    (error as any).response = {
      status: res.status,
      data: errorData
    };
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      // Optimized cache settings for better performance
      staleTime: 1000 * 60 * 2, // 2 minutes - reduced API calls
      gcTime: 1000 * 60 * 10, // 10 minutes - longer cache retention
      // Smart retry logic with optimized delays
      retry: (failureCount, error: any) => {
        // Don't retry client errors (except rate limiting)
        if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 429) {
          return false;
        }
        // Limit retries to reduce server load
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Network mode optimization for better offline experience
      networkMode: 'online',
    },
    mutations: {
      retry: false,
      // Network mode for mutations
      networkMode: 'online',
    },
  },
});
