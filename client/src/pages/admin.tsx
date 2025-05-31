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
import { insertWeekSchema } from "@shared/schema";

const Admin: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateWeekDialogOpen, setIsCreateWeekDialogOpen] = useState(false);

  // Check if user is authenticated and is admin
  const { data: auth, isLoading: isAuthLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const isAdmin = auth?.user?.isAdmin;

  // If not admin, redirect to login form
  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      // Show login form
    }
  }, [isAuthLoading, isAdmin]);

  // Fetch active week with topics
  const { data: activeWeek, isLoading: isWeekLoading, refetch: refetchActiveWeek } = useQuery({
    queryKey: ["/api/weeks/active"],
    enabled: !!isAdmin,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: z.infer<typeof loginSchema>) => {
      return apiRequest("POST", "/api/auth/login", credentials);
    },
    onSuccess: () => {
      toast({
        title: "ログイン成功",
        description: "管理者としてログインしました。",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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

  // Form schemas
  const loginSchema = z.object({
    username: z.string().min(1, "ユーザー名を入力してください"),
    password: z.string().min(1, "パスワードを入力してください"),
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

  // Handle tab change
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Filter topics based on active tab
  const getFilteredTopics = () => {
    if (!activeWeek?.topics) return [];
    
    let filteredTopics: any[] = [];
    
    switch (activeTab) {
      case "deleted":
        // Show deleted topics (topics with status "deleted")
        filteredTopics = activeWeek.topics.filter(topic => topic.status === "deleted");
        break;
      case "featured":
        // Show featured topics sorted by oldest featured first (featuredAt ascending)
        filteredTopics = activeWeek.topics
          .filter(topic => topic.status === "featured")
          .sort((a, b) => {
            const aTime = a.featuredAt ? new Date(a.featuredAt).getTime() : 0;
            const bTime = b.featuredAt ? new Date(b.featuredAt).getTime() : 0;
            return aTime - bTime;
          });
        // For featured topics, don't apply additional sorting by stars
        return filteredTopics;
      case "all":
      default:
        // Show all non-deleted topics
        filteredTopics = activeWeek.topics.filter(topic => topic.status !== "deleted");
        break;
    }
    
    // For non-featured tabs, sort by stars count (descending) - topics with more "聞きたい" votes appear first
    return filteredTopics.sort((a, b) => b.starsCount - a.starsCount);
  };

  const filteredTopics = getFilteredTopics();

  // Week creation form
  const weekFormSchema = insertWeekSchema.extend({
    title: z.string().min(1, "タイトルを入力してください"),
    startDate: z.string().min(1, "開始日を入力してください"),
    endDate: z.string().min(1, "終了日を入力してください"),
  });

  const weekForm = useForm<z.infer<typeof weekFormSchema>>({
    resolver: zodResolver(weekFormSchema),
    defaultValues: {
      title: "",
      startDate: "",
      endDate: "",
      isActive: false,
    },
  });

  // Create week mutation
  const createWeekMutation = useMutation({
    mutationFn: (data: z.infer<typeof weekFormSchema>) => {
      const weekData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
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

  const handleCreateWeek = (values: z.infer<typeof weekFormSchema>) => {
    createWeekMutation.mutate(values);
  };

  // Generate markdown list for featured topics
  const generateMarkdownList = () => {
    const featuredTopics = activeWeek?.topics
      ?.filter(topic => topic.status === "featured")
      ?.sort((a, b) => {
        const aTime = a.featuredAt ? new Date(a.featuredAt).getTime() : 0;
        const bTime = b.featuredAt ? new Date(b.featuredAt).getTime() : 0;
        return aTime - bTime;
      }) || [];

    if (featuredTopics.length === 0) {
      return "採用されたトピックがありません。";
    }

    const markdown = featuredTopics
      .map((topic) => `- [${topic.title}](${topic.url})`)
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

  // If not admin and not loading, show login form
  if (!isAdmin && !isAuthLoading) {
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
        </div>
        
        {/* Create Week Button */}
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

      {/* Tab Navigation */}
      <TabNavigation onTabChange={handleTabChange} activeTab={activeTab} />

      {/* Topics List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>
            {activeTab === "deleted" ? "削除済みトピック" : 
             activeTab === "featured" ? "採用されたトピック（古い順）" : 
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
          ) : !activeWeek ? (
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
    </div>
  );
};

export default Admin;