import React from "react";
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

const Submit: React.FC = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isLoading, setIsLoading] = React.useState(false);
  const queryClient = useQueryClient();
  
  // Fetch active week
  const { data: activeWeek, isLoading: isLoadingWeek } = useQuery({
    queryKey: ["/api/weeks/active"],
  });

  // Extended schema with custom validation
  const formSchema = submitTopicSchema.extend({
    title: z.string().min(5, {
      message: "タイトルは5文字以上である必要があります",
    }),
    url: z.string().url({
      message: "有効なURLを入力してください",
    }),
    description: z.string().min(10, {
      message: "説明は10文字以上である必要があります",
    }),
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      url: "",
      description: "",
      submitter: getSavedSubmitter(),
    },
  });

  // URLが変更されたときに記事情報を自動取得
  const watchedUrl = form.watch('url');
  
  React.useEffect(() => {
    const fetchUrlInfo = async (url: string) => {
      if (!url || url.trim() === '') return;
      
      try {
        setIsLoading(true);
        const response = await fetch(`/api/fetch-url-info?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Failed to fetch URL info');
        
        const data = await response.json();
        
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
      
      // 現在のweekデータをスナップショットとして保存
      const previousWeekData = queryClient.getQueryData(["/api/weeks/active"]);
      
      // キャッシュを楽観的に更新（新しいトピックを追加）
      queryClient.setQueryData(["/api/weeks/active"], (oldData: any) => {
        if (!oldData) return oldData;
        
        // 楽観的に作成される新しいトピック（仮のID等を設定）
        const optimisticTopic: TopicWithCommentsAndStars = {
          id: Math.floor(Math.random() * -1000000), // 一時的な負のID
          title: newTopic.title,
          url: newTopic.url,
          description: newTopic.description,
          submitter: newTopic.submitter,
          weekId: activeWeek.id,
          status: "pending",
          createdAt: new Date(),
          stars: 0,
          comments: [],
          starsCount: 0,
          hasStarred: false
        };
        
        // 新しいトピックを追加したweekデータを返す
        return {
          ...oldData,
          topics: [optimisticTopic, ...(oldData.topics || [])]
        };
      });
      
      // ロールバック用に前の状態を返す
      return { previousWeekData };
    },
    onError: (err, newTopic, context) => {
      // エラー時は以前の状態に戻す
      if (context?.previousWeekData) {
        queryClient.setQueryData(["/api/weeks/active"], context.previousWeekData);
      }
      console.error("Failed to submit topic:", err);
      toast({
        title: "エラー",
        description: "トピックの投稿に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "トピックを投稿しました",
        description: "トピックの投稿ありがとうございます！",
      });
      
      // 必要なクエリを無効化して再フェッチする
      queryClient.invalidateQueries({ queryKey: ["/api/weeks/active"] });
      
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
                      <FormLabel>説明</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="トピックについての簡単な説明を入力してください"
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
                    disabled={form.formState.isSubmitting}
                    className="bg-primary hover:bg-primary-700"
                  >
                    {form.formState.isSubmitting ? "送信中..." : "投稿する"}
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
