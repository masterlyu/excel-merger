import React from 'react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 로고 영역 */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-800">
              Excel Merger
            </Link>
          </div>
          
          {/* 네비게이션 메뉴 */}
          <nav className="flex space-x-8">
            <Link href="/upload" className="inline-flex items-center px-1 pt-1 text-gray-500 hover:text-gray-700">
              파일 업로드
            </Link>
            <Link href="/mapping" className="inline-flex items-center px-1 pt-1 text-gray-500 hover:text-gray-700">
              필드 매핑
            </Link>
            <Link href="/preview" className="inline-flex items-center px-1 pt-1 text-gray-500 hover:text-gray-700">
              미리보기
            </Link>
            <Link href="/export" className="inline-flex items-center px-1 pt-1 text-gray-500 hover:text-gray-700">
              내보내기
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
} 