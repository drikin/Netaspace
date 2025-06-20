import React from "react";
import { useQuery } from "@tanstack/react-query";

interface VersionInfo {
  app: string;
  extension: string;
  releaseDate: string;
}

const Footer = () => {
  const { data: versionInfo } = useQuery<VersionInfo>({
    queryKey: ['/api/version'],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  return (
    <footer className="bg-white mt-12 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="flex justify-center space-x-6">
            <a
              href="https://backspace.fm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Podcast</span>
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
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </a>
            <a
              href="https://twitter.com/backspacefm"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="sr-only">Twitter</span>
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
          <div>
            <p className="text-center text-base text-gray-400">
              &copy; {new Date().getFullYear()} ポッドキャスト用ネタ帳 for backspace.fm. All rights reserved.
              {versionInfo && (
                <span className="block mt-1 text-sm text-gray-300">
                  v{versionInfo.app} (Extension: v{versionInfo.extension})
                </span>
              )}
              <span className="block mt-2 text-xs text-gray-300">
                <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded">?</kbd> キーでヘルプ
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
