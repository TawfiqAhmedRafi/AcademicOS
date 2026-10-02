"use client";

import { useState } from "react";
import Pagination from "@/app/components/Pagination";

type DataItem = {
  _id: string | string[];
  count: number;
};

type PaginatedInsightCardProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  data: DataItem[];
  colorClass: "blue" | "red" | "orange";
  isTokens?: boolean;
};

export default function PaginatedInsightCard({
  title,
  description,
  icon,
  data,
  colorClass,
  isTokens = false,
}: PaginatedInsightCardProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const currentData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const colors = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/40",
      text: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    },
    red: {
      bg: "bg-red-100 dark:bg-red-900/40",
      text: "text-red-600 dark:text-red-400",
      badge: "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    },
    orange: {
      bg: "bg-orange-100 dark:bg-orange-900/40",
      text: "text-orange-600 dark:text-orange-400",
      badge: "bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
    },
  };

  const theme = colors[colorClass];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-[580px]">
      <div className="p-5 border-b border-gray-50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex items-center gap-3 shrink-0">
        <div className={`p-2 rounded-lg ${theme.bg} ${theme.text}`}>
          {icon}
        </div>
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      
      <div className="p-2 flex-1 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1">
          {currentData.map((q, i) => {
            const displayId = isTokens
              ? q._id
              : Array.isArray(q._id)
              ? q._id.join(" ")
              : q._id || "(empty)";
            
            const globalIndex = (currentPage - 1) * itemsPerPage + i + 1;

            return (
              <li
                key={i}
                className="flex justify-between items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-xl transition-colors group"
              >
                <span className={`font-medium text-gray-700 dark:text-gray-300 ${isTokens ? "flex items-center gap-2" : "truncate pr-4"}`}>
                  {isTokens && (
                    <span className="text-gray-300 dark:text-gray-600 font-mono text-xs w-5">
                      {globalIndex}.
                    </span>
                  )}
                  {displayId}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full group-hover:scale-105 transition-transform shrink-0 ${theme.badge}`}
                >
                  {q.count}
                </span>
              </li>
            );
          })}
          {data.length === 0 && (
            <li className="p-6 text-center text-gray-400 text-sm">
              No data yet.
            </li>
          )}
        </ul>
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 shrink-0 bg-white dark:bg-gray-800 mt-auto">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages > 0 ? totalPages : 1}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
