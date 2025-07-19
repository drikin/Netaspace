import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { ReleaseNotesDialog } from "@/components/ui/release-notes-dialog";
import { LoginDialog } from "@/components/login-dialog";

const Header = () => {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is authenticated
  const { data: auth } = useQuery({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });

  const isAdmin = (auth as any)?.user?.username === 'admin';

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      
      toast({
        title: "ログアウトしました",
        description: "またのご利用をお待ちしております",
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "ログアウトに失敗しました",
        description: "もう一度お試しください",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location === path;

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <svg className="h-7 w-7 text-primary mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span className="font-bold text-xl tracking-tight">backspace.fmのネタ帳</span>
            </Link>
            <nav className="hidden sm:ml-8 sm:flex sm:items-center space-x-6">
              <Link 
                href="/extension"
                className={`inline-flex items-center px-3 py-2 border-b-2 ${isActive("/extension") ? "border-primary text-gray-900 font-medium" : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"} text-sm`}
              >
                拡張機能
              </Link>
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex items-center gap-3">
              {/* Release Notes Bell Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReleaseNotes(true)}
                className="text-gray-500 hover:text-blue-600 transition-colors"
                title="更新履歴を見る"
              >
                <Bell className="h-4 w-4" />
              </Button>
              
              {isAdmin ? (
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ログアウト
                </Button>
              ) : (
                <LoginDialog />
              )}
            </div>
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`sm:hidden ${mobileMenuOpen ? "" : "hidden"}`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link 
            href="/extension"
            className={`block pl-3 pr-4 py-2 border-l-4 ${isActive("/extension") ? "border-primary bg-primary-50 text-primary-700" : "border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"} text-base font-medium`}
          >
            拡張機能
          </Link>
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="flex items-center px-4">
            <div className="ml-3">
              <div className="text-base font-medium text-gray-800">
                {isAdmin ? "管理者" : "ゲスト"}
              </div>
              <div className="text-sm font-medium text-gray-500">
                {isAdmin ? (auth as any)?.user?.username : "ログインしていません"}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <button
              onClick={() => setShowReleaseNotes(true)}
              className="flex items-center w-full px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            >
              <Bell className="h-4 w-4 mr-2" />
              更新履歴
            </button>
            {isAdmin ? (
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                ログアウト
              </button>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  // モバイルではログインダイアログを開くための処理が必要
                  const loginButton = document.querySelector('[data-login-trigger]');
                  if (loginButton) {
                    (loginButton as HTMLElement).click();
                  }
                }}
                className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
              >
                管理者ログイン
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Release Notes Dialog */}
      <ReleaseNotesDialog
        isOpen={showReleaseNotes}
        onClose={() => setShowReleaseNotes(false)}
      />
    </header>
  );
};

export default Header;
