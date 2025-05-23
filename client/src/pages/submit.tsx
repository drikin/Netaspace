import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { submitTopicSchema } from "@shared/schema";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

const Submit: React.FC = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Fetch active week
  const { data: activeWeek } = useQuery({
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      url: "",
      description: "",
      submitter: "",
    },
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

    try {
      await apiRequest("POST", "/api/topics", values);
      
      toast({
        title: "トピックを投稿しました",
        description: "トピックの投稿ありがとうございます！",
      });
      
      // Redirect to home page
      navigate("/");
    } catch (error) {
      console.error("Failed to submit topic:", error);
      toast({
        title: "エラー",
        description: "トピックの投稿に失敗しました。もう一度お試しください。",
        variant: "destructive",
      });
    }
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
          {!activeWeek ? (
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
                  name="url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/article"
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
