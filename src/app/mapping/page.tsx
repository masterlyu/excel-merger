"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MappingConfigManager from '@/components/mapping/MappingConfigManager';
import FieldMapper from '@/components/mapping/FieldMapper';
import { loadFileInfos } from '@/lib/excel';
import { getActiveMappingConfig, loadMappingConfigById } from '@/lib/mapping';

export default function MappingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('config');
  const [selectedMappingId, setSelectedMappingId] = useState<string | null>(null);
  const [hasFiles, setHasFiles] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    // 파일 확인
    const files = loadFileInfos();
    setHasFiles(files.length > 0);
    
    // 파일이 없으면 업로드 페이지로 이동
    if (files.length === 0) {
      router.push('/upload');
      return;
    }
    
    // 활성 매핑 설정 확인
    const activeConfig = getActiveMappingConfig();
    if (activeConfig) {
      setSelectedMappingId(activeConfig.id);
    }
  }, [router]);

  // 매핑 설정 선택 처리
  const handleMappingSelect = (mappingId: string) => {
    setSelectedMappingId(mappingId);
    setActiveTab('mapping');
  };

  // 매핑 완료 처리
  const handleMappingComplete = (mappingId: string) => {
    router.push('/result');
  };

  if (!hasFiles) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-80">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">파일을 먼저 업로드해주세요</h2>
            <p className="text-muted-foreground mb-6">
              필드 매핑을 시작하기 전에 엑셀 파일을 업로드해야 합니다.
            </p>
            <button
              onClick={() => router.push('/upload')}
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
            >
              파일 업로드 페이지로 이동
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">필드 매핑</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="config">매핑 설정 관리</TabsTrigger>
          <TabsTrigger 
            value="mapping" 
            disabled={!selectedMappingId}
          >
            필드 매핑
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="config" className="mt-0">
          <MappingConfigManager onSelect={handleMappingSelect} />
        </TabsContent>
        
        <TabsContent value="mapping" className="mt-0">
          {selectedMappingId ? (
            <FieldMapper 
              onMappingComplete={handleMappingComplete}
            />
          ) : (
            <div className="rounded-lg border p-8 text-center">
              <h3 className="text-lg font-medium mb-2">매핑 설정을 선택해주세요</h3>
              <p className="text-muted-foreground">
                매핑 설정을 먼저 선택하거나 생성하세요.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 