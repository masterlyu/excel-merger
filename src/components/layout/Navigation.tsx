import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileUp, Table2, FileCheck } from 'lucide-react';
import { useFileStore } from '@/store/files';
import { getMappingConfigs } from '@/lib/mapping';

const steps = [
  {
    name: '파일 업로드',
    href: '/upload',
    icon: FileUp,
    description: '엑셀 파일을 업로드합니다',
  },
  {
    name: '필드 매핑',
    href: '/mapping',
    icon: Table2,
    description: '업로드된 파일의 필드를 매핑합니다',
    requiresFiles: true,
  },
  {
    name: '매핑 확인',
    href: '/confirm',
    icon: FileCheck,
    description: '매핑된 데이터를 확인하고 내보냅니다',
    requiresFiles: true,
    requiresMapping: true,
  },
];

export function Navigation() {
  const pathname = usePathname();
  const { files } = useFileStore();
  const currentStepIndex = steps.findIndex(step => step.href === pathname);
  
  // 매핑 설정 가져오기
  const mappingConfigs = React.useMemo(() => getMappingConfigs(), []);
  const hasMappingConfigs = mappingConfigs.length > 0;
  
  // 파일 업로드 상태
  const hasFiles = files && files.length > 0;

  return (
    <nav className="border-b bg-background">
      <div className="container flex h-16 items-center">
        <div className="flex items-center space-x-8">
          {steps.map((step, index) => {
            const isActive = pathname === step.href;
            const isCompleted = index < currentStepIndex && hasFiles;
            
            // 접근 불가능 조건 확인
            const isDisabled = 
              (step.requiresFiles && !hasFiles) || 
              (step.requiresMapping && !hasMappingConfigs);

            return (
              <Link
                key={step.href}
                href={isDisabled ? '#' : step.href}
                className={cn(
                  'group flex items-center space-x-2 text-sm font-medium transition-colors relative',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                  isCompleted && 'text-primary/80',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
                onClick={e => isDisabled && e.preventDefault()}
                title={step.description}
              >
                <div className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border transition-colors',
                  isActive ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground',
                  isCompleted && 'bg-primary/80 border-primary/80 text-primary-foreground',
                  isDisabled && 'bg-muted border-muted'
                )}>
                  <step.icon className="h-4 w-4" />
                </div>
                <span>{step.name}</span>
                
                {/* 파일 상태 표시 */}
                {step.requiresFiles && hasFiles && index === 1 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({files.length}개 파일)
                  </span>
                )}
                
                {/* 매핑 상태 표시 */}
                {step.requiresMapping && hasMappingConfigs && index === 2 && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({mappingConfigs.length}개 설정)
                  </span>
                )}
                
                {/* 툴팁 */}
                <span className="absolute -bottom-8 left-0 hidden w-max rounded bg-black/80 px-2 py-1 text-xs text-white group-hover:block">
                  {step.description}
                  {step.requiresFiles && !hasFiles && (
                    <span className="block text-red-300">파일 업로드 필요</span>
                  )}
                  {step.requiresMapping && !hasMappingConfigs && (
                    <span className="block text-red-300">매핑 설정 필요</span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 