import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import TopicCard from "@/components/ui/topic-card";
import TabNavigation from "@/components/tab-navigation";
import { PerformanceMonitor } from "@/components/performance-monitor";
import { insertWeekSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const Admin: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateWeekDialogOpen, setIsCreateWeekDialogOpen] = useState(false);
  const [isWeekListDialogOpen, setIsWeekListDialogOpen] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Use the auth hook
  const { user, isLoading: isAuthLoading, isAuthenticated, isAdmin, refetch: refetchAuth } = useAuth();


  // Show login form if not authenticated
  useEffect(() => {
    if (isAuthLoading) return; // Don't do anything while loading
    
    if (!isAuthenticated) {
      setShowLoginForm(true);
    } else if (isAuthenticated && isAdmin) {
      setShowLoginForm(false);
    } else if (isAuthenticated && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      setShowLoginForm(true);
    }
  }, [isAuthLoading, isAuthenticated, isAdmin, toast]);

  // Fetch active week with topics
  const { data: activeWeek, isLoading: isWeekLoading, refetch: refetchActiveWeek } = useQuery({
    queryKey: ["/api/weeks/active"],
    enabled: !!isAdmin,
  });

  // Fetch all weeks
  const { data: weeksData, isLoading: isWeeksLoading } = useQuery({
    queryKey: ["/api/weeks"],
    enabled: !!isAdmin,
  });



  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginSchema>) => {
      return apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: async () => {
      toast({
        title: "ログイン成功",
        description: "管理者としてログインしました。",
      });
      // Invalidate all auth-related queries
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Force refetch to get fresh auth data
      await refetchAuth();
      // Update login form state
      setShowLoginForm(false);
    },
    onError: (error) => {
      console.error("Login failed:", error);
      toast({
        title: "ログインに失敗しました",
        description: "ユーザー名またはパスワードが無効です。",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      toast({
        title: "ログアウト完了",
        description: "正常にログアウトしました。",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setShowLoginForm(true);
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Filter topics based on active tab
  const getFilteredTopics = () => {
    let filteredTopics: any[] = [];
    
    switch (activeTab) {
      case "featured":
        // Show featured topics sorted by oldest featured first (featuredAt ascending)
        if (!(activeWeek as any)?.topics) return [];
        filteredTopics = (activeWeek as any).topics
          .filter((topic: any) => topic.status === "featured")
          .sort((a: any, b: any) => {
            const aTime = a.featuredAt ? new Date(a.featuredAt).getTime() : 0;
            const bTime = b.featuredAt ? new Date(b.featuredAt).getTime() : 0;
            return aTime - bTime;
          });
        // For featured topics, don't apply additional sorting by stars
        return filteredTopics;
      case "all":
      default:
        // Show pending and approved topics (not deleted or featured)
        if (!(activeWeek as any)?.topics) return [];
        filteredTopics = (activeWeek as any).topics.filter((topic: any) => 
          topic.status === "pending" || topic.status === "approved"
        );
        break;
    }
    
    // For non-featured tabs, sort by stars count (descending) - topics with more "聞きたい" votes appear first
    return Array.isArray(filteredTopics) ? filteredTopics.sort((a, b) => b.starsCount - a.starsCount) : [];
  };

  const filteredTopics = getFilteredTopics();

  // Get default dates (today + 7 days)
  const getDefaultDates = () => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const formatDate = (date: Date) => {
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    };

    return {
      startDate: formatDate(today),
      endDate: formatDate(nextWeek),
    };
  };

  // Week creation form
  const weekFormSchema = z.object({
    title: z.string().min(1, "タイトルを入力してください"),
    startDate: z.string().min(1, "開始日を入力してください"),
    endDate: z.string().min(1, "終了日を入力してください"),
    isActive: z.boolean().default(false),
  });

  const weekForm = useForm<z.infer<typeof weekFormSchema>>({
    resolver: zodResolver(weekFormSchema),
    defaultValues: {
      title: "",
      ...getDefaultDates(),
      isActive: false,
    },
  });

  // Create week mutation
  const createWeekMutation = useMutation({
    mutationFn: (data: z.infer<typeof weekFormSchema>) => {
      const weekData = {
        title: data.title,
        startDate: data.startDate, // Already in YYYY-MM-DD string format
        endDate: data.endDate,     // Already in YYYY-MM-DD string format
        isActive: data.isActive,
      };
      return apiRequest("POST", "/api/weeks", weekData);
    },
    onSuccess: () => {
      toast({
        title: "週を作成しました",
        description: "新しい週が正常に作成されました。",
      });
      setIsCreateWeekDialogOpen(false);
      weekForm.reset();
      // Refresh the weeks data
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
    },
    onError: (error) => {
      console.error("Failed to create week:", error);
      toast({
        title: "エラー",
        description: "週の作成に失敗しました。",
        variant: "destructive",
      });
    },
  });

  // Set active week mutation
  const setActiveWeekMutation = useMutation({
    mutationFn: (weekId: number) => {
      return apiRequest("POST", `/api/weeks/${weekId}/setActive`, {});
    },
    onSuccess: () => {
      toast({
        title: "アクティブ週を変更しました",
        description: "新しい週がアクティブになりました。",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/weeks"] });
      setIsWeekListDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "アクティブ週の変更に失敗しました。",
        variant: "destructive",
      });
    },
  });

  const handleCreateWeek = (values: z.infer<typeof weekFormSchema>) => {
    createWeekMutation.mutate(values);
  };

  const handleSetActiveWeek = (weekId: number) => {
    setActiveWeekMutation.mutate(weekId);
  };

  // Generate markdown list for featured topics
  const generateMarkdownList = () => {
    const featuredTopics = (activeWeek as any)?.topics
      ?.filter((topic: any) => topic.status === "featured")
      ?.sort((a: any, b: any) => {
        const aTime = a.featuredAt ? new Date(a.featuredAt).getTime() : 0;
        const bTime = b.featuredAt ? new Date(b.featuredAt).getTime() : 0;
        return aTime - bTime;
      }) || [];

    if (featuredTopics.length === 0) {
      return "採用されたトピックがありません。";
    }

    const markdown = featuredTopics
      .map((topic: any) => `- [${topic.title}](${topic.url})`)
      .join('\n');

    return markdown;
  };

  // Copy markdown to clipboard
  const copyMarkdownToClipboard = async () => {
    const markdown = generateMarkdownList();
    try {
      await navigator.clipboard.writeText(markdown);
      toast({
        title: "コピーしました",
        description: "マークダウンリストをクリップボードにコピーしました。",
      });
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast({
        title: "エラー",
        description: "クリップボードへのコピーに失敗しました。",
        variant: "destructive",
      });
    }
  };

  // Database export functionality
  const exportDatabaseMutation = useMutation({
    mutationFn: async (format: 'json' | 'csv' | 'sqlite') => {
      const response = await fetch(`/api/admin/export/${format}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      return { response, format };
    },
    onSuccess: async ({ response, format }) => {
      try {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `database-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        const formatName = format === 'sqlite' ? 'SQLite' : format.toUpperCase();
        toast({
          title: "エクスポート完了",
          description: `データベースを${formatName}形式でダウンロードしました。`,
        });
      } catch (error) {
        console.error('Download failed:', error);
        toast({
          title: "ダウンロードエラー",
          description: "ファイルのダウンロードに失敗しました。",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Export failed:', error);
      toast({
        title: "エクスポートエラー",
        description: "データベースのエクスポートに失敗しました。",
        variant: "destructive",
      });
    },
  });

  const handleExportDatabase = (format: 'json' | 'csv' | 'sqlite') => {
    exportDatabaseMutation.mutate(format);
  };

  

  // Show loading state during authentication
  if (isAuthLoading) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 mb-6">
          <div className="text-center">
            <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
              <span className="sr-only">Loading...</span>
            </div>
            <p className="mt-2 text-sm text-gray-600">認証状態を確認しています...</p>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated or not admin, show login form
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">管理者ログイン</h1>
          <p className="mt-1 text-sm text-gray-600">
            管理者機能にアクセスするには、認証が必要です
          </p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ユーザー名</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>パスワード</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="●●●●●●"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginForm.formState.isSubmitting}
                >
                  {loginForm.formState.isSubmitting ? "ログイン中..." : "ログイン"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">管理ページ</h1>
          <p className="mt-1 text-sm text-gray-600">
            投稿されたトピックを管理できます。不適切なトピックを削除してください。
          </p>
          <p className="mt-1 text-xs text-gray-500">
            ログイン中: {(user as any)?.user?.username}
          </p>
        </div>
        
        {/* User Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? "ログアウト中..." : "ログアウト"}
          </Button>
        </div>
        
        {/* Management Buttons */}
        <div className="flex gap-2 flex-wrap">
          {/* Database Export Buttons */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportDatabase('json')}
              disabled={exportDatabaseMutation.isPending}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportDatabase('csv')}
              disabled={exportDatabaseMutation.isPending}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </Button>
          </div>

          

          <Dialog open={isWeekListDialogOpen} onOpenChange={setIsWeekListDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                週を切り替え
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>週を切り替え</DialogTitle>
                <DialogDescription>
                  アクティブにする週を選択してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {isWeeksLoading ? (
                  <p className="text-center text-muted-foreground">読み込み中...</p>
                ) : (weeksData as any) && (weeksData as any).length > 0 ? (
                  (weeksData as any).map((week: any) => (
                    <div
                      key={week.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        week.isActive 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => !week.isActive && handleSetActiveWeek(week.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">{week.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(week.startDate).toLocaleDateString('ja-JP')} 〜 {new Date(week.endDate).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        {week.isActive && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            アクティブ
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">週がありません</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateWeekDialogOpen} onOpenChange={setIsCreateWeekDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                新しい週を作成
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新しい週を作成</DialogTitle>
              <DialogDescription>
                翌週のネタページを作成してください
              </DialogDescription>
            </DialogHeader>
            <Form {...weekForm}>
              <form onSubmit={weekForm.handleSubmit(handleCreateWeek)} className="space-y-4">
                <FormField
                  control={weekForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>タイトル</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="例: 2025年6月第1週"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={weekForm.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>開始日</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={weekForm.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>終了日</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex flex-col gap-2">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createWeekMutation.isPending}
                  >
                    {createWeekMutation.isPending ? "作成中..." : "週を作成"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    新しい週を作成すると、ユーザーはその期間のネタを投稿できるようになります。
                  </p>
                </div>
              </form>
            </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation onTabChange={handleTabChange} activeTab={activeTab} isAdmin={isAdmin} isAuthenticated={isAuthenticated} context="admin" />

      {/* Performance Monitor Tab */}
      {activeTab === "performance" && (
        <PerformanceMonitor />
      )}

      {/* Topics List */}
      {activeTab !== "performance" && (
        <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>
            {activeTab === "featured" ? "採用されたトピック（古い順）" : 
             "投稿されたトピック"}
          </CardTitle>
          {activeTab === "featured" && (
            <Button
              onClick={copyMarkdownToClipboard}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              マークダウンリストをコピー
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isWeekLoading ? (
            // Loading state
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-100 rounded-lg p-6 animate-pulse"
                >
                  <div className="h-7 bg-gray-200 rounded w-3/4 mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-12 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : !activeWeek && activeTab !== "deleted" ? (
            <p className="text-gray-500 text-center py-8">
              アクティブな週がありません。
            </p>
          ) : filteredTopics.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {activeTab === "deleted" 
                ? "削除済みのトピックはありません" 
                : activeTab === "featured"
                ? "採用されたトピックはありません"
                : "トピックはまだ投稿されていません"}
            </p>
          ) : (
            <div className="space-y-4">
              {filteredTopics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  isAdmin={true}
                  refetchTopics={refetchActiveWeek}
                />
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Admin;