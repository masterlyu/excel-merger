import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/**
 * 페이지 헤더 컴포넌트
 * 페이지 제목과 설명, 선택적 작업 버튼을 표시합니다.
 */
export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
} 