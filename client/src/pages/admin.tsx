import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRouter } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import MarkdownExport from "@/components/markdown-export";
import TopicCard from "@/components/ui/topic-card";
import { getCurrentWeekRange, formatDateRange } from "@/lib/date-utils";
import { insertWeekSchema } from "@shared/schema";

const Admin: React.FC = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("topics");

  // Check if user is authenticated and is admin
  const { data: auth, isLoading: isAuthLoading } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const isAdmin = auth?.user?.isAdmin;

  // If not admin, redirect to login form
  useEffect(() => {
    if (!isAuthLoading && !isAdmin) {
      setActiveTab("login");
    }
  }, [isAuthLoading, isAdmin]);

  // Fetch active week with topics for the admin view - 自動更新を10秒ごとに行う
  const { data: activeWeek, isLoading: isWeekLoading, refetch: refetchActiveWeek } = useQuery({
    queryKey: ["/api/weeks/active"],
    enabled: !!isAdmin,
    refetchInterval: 10000, // 10秒ごとに自動更新
    refetchOnWindowFocus: true, // ウィンドウにフォーカスが戻ったとき更新
  });

  // Fetch all weeks for week management
  const { data: weeks, isLoading: isWeeksLoading, refetch: refetchWeeks } = useQuery({
    queryKey: ["/api/weeks"],
    enabled: !!isAdmin,
  });

  // Fetch pending topics
  const { data: pendingTopics, isLoading: isPendingLoading, refetch: refetchPendingTopics } = useQuery({
    queryKey: ["/api/topics", { status: "pending" }],
    enabled: !!isAdmin,
  });

  // Create a new week mutation
  const createWeekMutation = useMutation({
    mutationFn: async (weekData: z.infer<typeof newWeekSchema>) => {
      return apiRequest("POST", "/api/weeks", weekData);
    },
    onSuccess: () => {
      toast({
        title: "週を作成しました",
        description: "新しい週を正常に作成しました。",
      });
      refetchWeeks();
    },
    onError: (error) => {
      console.error("Failed to create week:", error);
      toast({
        title: "週の作成に失敗しました",
        description: "エラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    },
  });

  // Set active week mutation
  const setActiveWeekMutation = useMutation({
    mutationFn: async (weekId: number) => {
      return apiRequest("POST", `/api/weeks/${weekId}/setActive`, {});
    },
    onSuccess: () => {
      toast({
        title: "アクティブな週を設定しました",
        description: "アクティブな週を正常に更新しました。",
      });
      refetchWeeks();
      refetchActiveWeek();
    },
    onError: (error) => {
      console.error("Failed to set active week:", error);
      toast({
        title: "アクティブな週の設定に失敗しました",
        description: "エラーが発生しました。もう一度お試しください。",
        variant: "destructive",
      });
    },
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
      setActiveTab("topics");
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

  const newWeekSchema = insertWeekSchema.extend({
    title: z.string().min(1, "タイトルを入力してください"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isActive: z.boolean().default(false),
  });

  // Form setup
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Get current week range for new week form
  const currentWeekRange = getCurrentWeekRange();
  const newWeekForm = useForm<z.infer<typeof newWeekSchema>>({
    resolver: zodResolver(newWeekSchema),
    defaultValues: {
      title: `${currentWeekRange.startDate.getFullYear()}年${currentWeekRange.startDate.getMonth() + 1}月${currentWeekRange.startDate.getDate()}日〜${currentWeekRange.endDate.getMonth() + 1}月${currentWeekRange.endDate.getDate()}日`,
      startDate: currentWeekRange.startDate,
      endDate: currentWeekRange.endDate,
      isActive: true,
    },
  });

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onNewWeekSubmit = (values: z.infer<typeof newWeekSchema>) => {
    createWeekMutation.mutate(values);
    newWeekForm.reset();
  };

  const handleSetActiveWeek = (weekId: number) => {
    setActiveWeekMutation.mutate(weekId);
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
      <div className="px-4 sm:px-0 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">管理ページ</h1>
        <p className="mt-1 text-sm text-gray-600">
          ポッドキャストのネタを管理する管理者専用ページです
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="mb-6 w-full max-w-md grid grid-cols-3">
          <TabsTrigger value="topics">トピック管理</TabsTrigger>
          <TabsTrigger value="weeks">週の管理</TabsTrigger>
          <TabsTrigger value="export">エクスポート</TabsTrigger>
        </TabsList>

        {/* Topics management tab */}
        <TabsContent value="topics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>承認待ちトピック</CardTitle>
            </CardHeader>
            <CardContent>
              {isPendingLoading ? (
                // Loading state
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
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
              ) : !pendingTopics || pendingTopics.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  承認待ちのトピックはありません
                </p>
              ) : (
                <div className="space-y-4">
                  {pendingTopics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      isAdmin={true}
                      refetchTopics={() => {
                        refetchPendingTopics();
                        refetchActiveWeek();
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>今週のトピック</CardTitle>
            </CardHeader>
            <CardContent>
              {isWeekLoading ? (
                // Loading state
                <div className="space-y-4">
                  {Array.from({ length: 2 }).map((_, i) => (
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
                <p className="text-gray-500 text-center py-4">
                  アクティブな週がありません。週の管理タブで作成してください。
                </p>
              ) : !activeWeek.topics || activeWeek.topics.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  今週のトピックはまだありません
                </p>
              ) : (
                <div className="space-y-4">
                  {activeWeek.topics.map((topic) => (
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
        </TabsContent>

        {/* Weeks management tab */}
        <TabsContent value="weeks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>新しい週を作成</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...newWeekForm}>
                <form onSubmit={newWeekForm.handleSubmit(onNewWeekSubmit)} className="space-y-4">
                  <FormField
                    control={newWeekForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>タイトル</FormLabel>
                        <FormControl>
                          <Input placeholder="2023年11月6日〜11月12日" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={newWeekForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>開始日</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={newWeekForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>終了日</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : field.value} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={newWeekForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                            checked={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">アクティブな週として設定する</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={newWeekForm.formState.isSubmitting || createWeekMutation.isPending}
                  >
                    {newWeekForm.formState.isSubmitting || createWeekMutation.isPending
                      ? "作成中..."
                      : "週を作成"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>週の一覧</CardTitle>
            </CardHeader>
            <CardContent>
              {isWeeksLoading ? (
                // Loading state
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 bg-gray-100 rounded animate-pulse"
                    ></div>
                  ))}
                </div>
              ) : !weeks || weeks.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  週がまだ作成されていません
                </p>
              ) : (
                <div className="space-y-3">
                  {weeks.map((week) => (
                    <div
                      key={week.id}
                      className="flex justify-between items-center p-3 border rounded-md"
                    >
                      <div>
                        <div className="font-medium">
                          {week.title}
                          {week.isActive && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                              現在
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDateRange(week.startDate, week.endDate)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={week.isActive || setActiveWeekMutation.isPending}
                        onClick={() => handleSetActiveWeek(week.id)}
                      >
                        {week.isActive ? "アクティブ" : "アクティブに設定"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export tab */}
        <TabsContent value="export">
          {activeWeek ? (
            <MarkdownExport week={activeWeek} topics={activeWeek.topics || []} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-500 py-4">
                  アクティブな週がありません。エクスポートするにはアクティブな週を設定してください。
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
