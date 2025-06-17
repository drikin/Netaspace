import React, { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitTopicSchema, TopicWithCommentsAndStars } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { useFingerprint } from "@/hooks/use-fingerprint";

const Submit: React.FC = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleNewsLink, setIsGoogleNewsLink] = React.useState(false);
  const [originalNewsUrl, setOriginalNewsUrl] = React.useState('');
  const queryClient = useQueryClient();
  const fingerprint = useFingerprint();
  
  // Fetch active week
  const { data: activeWeek, isLoading: isLoadingWeek } = useQuery({
    queryKey: ["/api/weeks/active", fingerprint],
    staleTime: 30 * 1000, // 30秒キャッシュ
  });

  // Extended schema with custom validation
  const formSchema = submitTopicSchema.extend({
    title: z.string().min(5, {
      message: "タイトルは5文字以上である必要があります",
    }),
    url: z.string().url({
      message: "有効なURLを入力してください",
    }),
    description: z.string().optional().or(z.literal('')),
    submitter: z.string().min(1, {
      message: "お名前を入力してください",
    }),
  });

  // ローカルストレージから投稿者名を取得
  const getSavedSubmitter = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('submitterName') || '';
    }
    return '';
  };

  // URLパラメータから初期値を取得
  const getInitialValues = () => {
    if (typeof window === 'undefined') {
      return {
        title: "",
        url: "",
        description: "",
        submitter: getSavedSubmitter(),
      };
    }

    const urlParams = new URLSearchParams(window.location.search);
    return {
      title: urlParams.get('title') || "",
      url: urlParams.get('url') || "",
      description: urlParams.get('description') || "",
      submitter: urlParams.get('submitter') || getSavedSubmitter(),
    };
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(),
  });

  // URLが変更されたときに記事情報を自動取得
  const watchedUrl = form.watch('url');
  
  React.useEffect(() => {
    const fetchUrlInfo = async (url: string) => {
      if (!url || url.trim() === '') return;
      
      // Googleニュースリンクかどうかをチェック
      const isGoogleNews = url.includes('news.google.com');
      setIsGoogleNewsLink(isGoogleNews);
      
      if (isGoogleNews) {
        toast({
          title: "Googleニュースリンクを検出しました",
          description: "Googleニュースのリンクからは元の記事情報を正確に取得できない場合があります。可能であれば元の記事URLを使用してください。",
          variant: "destructive",
          duration: 7000
        });
      }
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/fetch-url-info?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Failed to fetch URL info');
        
        const data = await response.json();
        
        // Googleニュースのリンクの場合は、サーバーからの応答を確認
        if (data.isGoogleNews) {
          // Googleニュースリンクであることがサーバーから通知された場合
          toast({
            title: "元の記事URLを使用してください",
            description: "Googleニュースのリンクからは元の記事情報を取得できません。元の記事URLを直接入力してください。",
            variant: "destructive",
            duration: 7000
          });
          setIsLoading(false);
          return;
        }
        
        // リダイレクト先URLがある場合は、それに更新する
        if (data.finalUrl && data.finalUrl !== url) {
          form.setValue('url', data.finalUrl);
        }
        
        // タイトルと説明文が空の場合のみ自動設定
        if (!form.getValues('title')) {
          form.setValue('title', data.title);
        }
        
        if (!form.getValues('description')) {
          form.setValue('description', data.description);
        }
        
        // 成功したらGoogleニュースリンクフラグをリセット
        if (data.title || data.description) {
          setIsGoogleNewsLink(false);
        }
      } catch (error) {
        console.error('Error fetching URL info:', error);
        toast({
          title: "情報取得エラー",
          description: "URLから情報を取得できませんでした。手動で入力してください。",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    // URLが変更されたら500msディレイで情報取得（タイピング中の連続APIコールを防ぐ）
    const timer = setTimeout(() => {
      if (watchedUrl && watchedUrl.startsWith('http')) {
        fetchUrlInfo(watchedUrl);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [watchedUrl, form]);

  // Keyboard shortcut for returning to home (Esc key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger if Esc key is pressed and no modifiers are pressed
      if (
        event.key === 'Escape' && 
        !event.ctrlKey && 
        !event.metaKey && 
        !event.altKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        navigate('/');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // トピック投稿のミューテーション（楽観的UI更新対応）
  const createTopicMutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/topics", data);
    },
    // 楽観的更新: APIレスポンスを待たずにUIを更新
    onMutate: async (newTopic) => {
      if (!activeWeek) return;
      
      // 既存のクエリをキャンセル
      await queryClient.cancelQueries({ queryKey: ["/api/weeks/active"] });
      await queryClient.cancelQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/weeks/active" 
      });
      
      // 現在のweekデータをスナップショットとして保存
      const previousWeekData = queryClient.getQueryData(["/api/weeks/active"]);
      
      // 楽観的に作成される新しいトピック（仮のID等を設定）
      const optimisticTopic: TopicWithCommentsAndStars = {
        id: Math.floor(Math.random() * -1000000), // 一時的な負のID
        title: newTopic.title,
        url: newTopic.url,
        description: newTopic.description || null,
        submitter: newTopic.submitter,
        weekId: activeWeek?.id || 0,
        status: "pending",
        createdAt: new Date(),
        stars: 0,
        featuredAt: null,
        fingerprint: 'temp-fingerprint',
        starsCount: 0,
        hasStarred: false
      };
      
      // 全ての関連するキャッシュを楽観的に更新
      const queryCache = queryClient.getQueryCache();
      const relatedQueries = queryCache.findAll({
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/weeks/active"
      });
      
      // キャッシュを楽観的に更新（新しいトピックを追加）
      queryClient.setQueryData(["/api/weeks/active"], (oldData: any) => {
        if (!oldData) return oldData;
        
        // 新しいトピックを追加したweekデータを返す
        return {
          ...oldData,
          topics: [optimisticTopic, ...(oldData.topics || [])]
        };
      });
      
      // fingerprint付きのクエリも更新
      relatedQueries.forEach(query => {
        if (query.queryKey.length > 1) {
          queryClient.setQueryData(query.queryKey, (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              topics: [optimisticTopic, ...(oldData.topics || [])]
            };
          });
        }
      });
      
      // ロールバック用に前の状態を返す
      return { previousWeekData };
    },
    onError: (err: any, newTopic, context) => {
      // エラー時は以前の状態に戻す
      if (context?.previousWeekData) {
        queryClient.setQueryData(["/api/weeks/active"], context.previousWeekData);
      }
      
      // 全ての関連するクエリを無効化してリフレッシュ
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/weeks/active" 
      });
      
      console.error("Failed to submit topic:", err);
      
      // 重複URLエラーの場合は専用メッセージを表示
      if (err?.response?.status === 409 && err?.response?.data?.code === 'DUPLICATE_URL') {
        const existingTopic = err.response.data.existingTopic;
        toast({
          title: "重複したURL",
          description: `このURLは既に「${existingTopic.title}」として${existingTopic.submitter}さんが投稿済みです。`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "エラー",
          description: "トピックの投稿に失敗しました。もう一度お試しください。",
          variant: "destructive",
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "トピックを投稿しました",
        description: "トピックの投稿ありがとうございます！",
      });
      
      // 必要なクエリを無効化して再フェッチする
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && 
          query.queryKey[0] === "/api/weeks/active" 
      });
      
      // ホームページに移動
      navigate("/");
    }
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!activeWeek) {
      toast({
        title: "エラー",
        description: "現在アクティブな週がありません。管理者にお問い合わせください。",
        variant: "destructive",
      });
      return;
    }
    
    // 投稿者名をローカルストレージに保存
    if (typeof window !== 'undefined' && values.submitter) {
      localStorage.setItem('submitterName', values.submitter);
    }

    // 楽観的UI更新を使ったミューテーション実行
    createTopicMutation.mutate(values);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0 mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">ネタを投稿</h1>
        <p className="mt-1 text-sm text-gray-600">
          backspace.fmで取り上げてほしい話題を投稿してください
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {isLoadingWeek ? (
            <div className="text-center py-6">
              <div className="flex justify-center items-center space-x-2 mb-4">
                <div className="animate-spin h-5 w-5 border-2 border-primary rounded-full border-t-transparent"></div>
                <p className="text-gray-500">データを読み込み中...</p>
              </div>
            </div>
          ) : !activeWeek ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">
                現在アクティブな週がありません。管理者がアクティブな週を設定するまでお待ちください。
              </p>
              <Link href="/">
                <Button variant="outline">トップページに戻る</Button>
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <div className="relative max-w-2xl">
                        <FormControl>
                          <Input
                            placeholder="https://example.com/article"
                            {...field}
                            className="pr-8"
                          />
                        </FormControl>
                        {isLoading && (
                          <div className="absolute right-3 top-2">
                            <div className="animate-spin h-5 w-5 border-2 border-gray-500 rounded-full border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">URLを入力すると、タイトルと説明が自動的に取得されます</p>
                      {isGoogleNewsLink && (
                        <div className="mt-2 p-3 border border-yellow-300 bg-yellow-50 rounded-md">
                          <h4 className="text-sm font-medium text-yellow-800">Googleニュースリンクを検出しました</h4>
                          <p className="text-xs text-yellow-800 mt-1">
                            Googleニュースのリンクからは元の記事情報を正確に取得できない場合があります。
                            可能であれば元の記事URLを直接入力してください。
                          </p>
                          <div className="mt-2">
                            <Input
                              placeholder="元の記事のURL（例：https://www.sanspo.com/article/...）"
                              value={originalNewsUrl}
                              onChange={(e) => setOriginalNewsUrl(e.target.value)}
                              className="text-sm mb-2"
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                if (originalNewsUrl) {
                                  form.setValue('url', originalNewsUrl);
                                  setIsGoogleNewsLink(false);
                                  setOriginalNewsUrl('');
                                  
                                  // 少し遅延させて新しいURLの情報を取得
                                  setTimeout(() => {
                                    const fetchUrl = async () => {
                                      try {
                                        setIsLoading(true);
                                        const response = await fetch(`/api/fetch-url-info?url=${encodeURIComponent(originalNewsUrl)}`);
                                        if (!response.ok) throw new Error('Failed to fetch URL info');
                                        
                                        const data = await response.json();
                                        
                                        // タイトルと説明文が空の場合のみ自動設定
                                        if (!form.getValues('title')) {
                                          form.setValue('title', data.title);
                                        }
                                        
                                        if (!form.getValues('description')) {
                                          form.setValue('description', data.description);
                                        }
                                      } catch (error) {
                                        console.error('Error fetching info from original URL:', error);
                                      } finally {
                                        setIsLoading(false);
                                      }
                                    };
                                    
                                    fetchUrl();
                                  }, 100);
                                }
                              }}
                            >
                              このURLを使用する
                            </Button>
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>タイトル</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="記事やニュースのタイトルを入力"
                          {...field}
                          className="max-w-2xl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>説明（オプション）</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="トピックについての簡単な説明を入力してください（任意）"
                          {...field}
                          className="max-w-2xl"
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="submitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>投稿者名</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="あなたのお名前"
                          {...field}
                          className="max-w-md"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting || createTopicMutation.isPending}
                    className="bg-primary hover:bg-primary-700"
                  >
                    {(form.formState.isSubmitting || createTopicMutation.isPending) ? "送信中..." : "投稿する"}
                  </Button>
                  <Link href="/">
                    <Button variant="outline" type="button">
                      キャンセル
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Submit;
