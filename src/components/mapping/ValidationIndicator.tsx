'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { ValidationResult } from '@/lib/validation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ValidationIndicatorProps {
  validationResult: ValidationResult;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}

/**
 * 유효성 검증 결과를 시각적으로 표시하는 컴포넌트
 * 유효성 검증 결과에 따라 성공, 오류, 경고 아이콘과 배지를 표시합니다.
 */
export function ValidationIndicator({
  validationResult,
  size = 'md',
  showDetails = true,
}: ValidationIndicatorProps) {
  const { isValid, errors, warnings } = validationResult;
  
  // 아이콘 크기 설정
  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size];
  
  // 배지 크기 설정
  const badgeSize = {
    sm: 'text-xs px-1.5 py-0',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  }[size];

  // 유효성 상태에 따른 아이콘 및 색상 결정
  if (isValid && warnings.length === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <CheckCircle className={`${iconSize} text-green-500`} />
              {showDetails && (
                <Badge variant="outline" className={`${badgeSize} text-green-500 border-green-200 bg-green-50`}>
                  유효함
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>모든 유효성 검사를 통과했습니다.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (!isValid) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <AlertCircle className={`${iconSize} text-red-500`} />
              {showDetails && (
                <Badge variant="outline" className={`${badgeSize} text-red-500 border-red-200 bg-red-50`}>
                  오류 {errors.length}개
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium text-red-500">검증 오류:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                {errors.slice(0, 5).map((error, index) => (
                  <li key={index}>{error.message}</li>
                ))}
                {errors.length > 5 && (
                  <li>...외 {errors.length - 5}개 오류</li>
                )}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 경고만 있는 경우
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            <AlertTriangle className={`${iconSize} text-amber-500`} />
            {showDetails && (
              <Badge variant="outline" className={`${badgeSize} text-amber-500 border-amber-200 bg-amber-50`}>
                경고 {warnings.length}개
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-amber-500">검증 경고:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              {warnings.slice(0, 5).map((warning, index) => (
                <li key={index}>{warning.message}</li>
              ))}
              {warnings.length > 5 && (
                <li>...외 {warnings.length - 5}개 경고</li>
              )}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 