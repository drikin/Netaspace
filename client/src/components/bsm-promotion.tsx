import React from "react";
import { Heart, ExternalLink } from "lucide-react";

const BsmPromotion: React.FC = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500">
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Heart className="h-4 w-4" />
          BSMでサポート
        </h3>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-gray-600 leading-relaxed mb-3">
          このサービスはbackspace.fmの有料版「BSM」の収益によって開発・運用されています。気に入っていただけたら、ぜひBSMへの入会をご検討ください。
        </p>
        <a
          href="https://backspace.fm/bsm/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
        >
          BSMに入会する
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};

export default BsmPromotion;
