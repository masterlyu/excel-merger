"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import MappingConfigManager from '@/components/mapping/MappingConfig';
import { loadFileInfos, readExcelFile } from '@/lib/excel';
import { loadMappingConfigs, saveMappingConfig, ColumnMapping, MappingConfig } from '@/lib/mapping';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// 클라이언트 전용으로 ColumnMapper 컴포넌트 import
const ColumnMapper = dynamic(
  () => import('@/components/mapping/ColumnMapper'),
  { ssr: false }
);

export default function MappingPage() {
  const [selectedConfig, setSelectedConfig] = React.useState<string | null>(null);
  const [selectedSourceFile, setSelectedSourceFile] = React.useState<string | null>(null);
  const [selectedSourceSheet, setSelectedSourceSheet] = React.useState<string | null>(null);
  const [mappings, setMappings] = React.useState<ColumnMapping[]>([]);
  const [sourceHeaders, setSourceHeaders] = React.useState<string[]>([]);
  const [targetHeaders, setTargetHeaders] = React.useState<string[]>([]);

  // 파일 정보 로드
  const fileInfos = loadFileInfos();
  const mappingConfigs = loadMappingConfigs();

  // 선택된 파일의 시트 목록
  const selectedFileSheets = React.useMemo(() => {
    if (!selectedSourceFile) return [];
    const fileInfo = fileInfos.find(info => info.id === selectedSourceFile);
    return fileInfo?.sheets || [];
  }, [selectedSourceFile, fileInfos]);

  // 매핑 설정 선택 시
  const handleConfigSelect = (config: MappingConfig) => {
    console.log('Selected config:', config);
    console.log('Records:', config.records);
    setSelectedConfig(config.id);
    setMappings(config.mappings || []);
    setTargetHeaders(config.records || []);
    setSourceHeaders([]);  // 소스 헤더 초기화
    setSelectedSourceFile(null);  // 선택된 파일 초기화
    setSelectedSourceSheet(null);  // 선택된 시트 초기화
  };

  // 소스 파일 선택 시
  const handleSourceFileSelect = async (fileId: string) => {
    setSelectedSourceFile(fileId);
    setSelectedSourceSheet(null);
    setSourceHeaders([]);

    const fileInfo = fileInfos.find(info => info.id === fileId);
    if (!fileInfo) return;

    try {
      // Base64 데이터를 ArrayBuffer로 변환
      const base64Data = fileInfo.data;
      const binaryData = atob(base64Data.split(',')[1]);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }

      const file = new File([array], fileInfo.name, {
        type: fileInfo.type,
        lastModified: fileInfo.lastModified
      });

      const excelData = await readExcelFile(file);
      const firstSheet = excelData.sheets[0];
      if (firstSheet) {
        setSelectedSourceSheet(firstSheet.name);
        setSourceHeaders(firstSheet.headers);

        // 자동 매핑 수행
        if (selectedConfig) {
          const config = mappingConfigs.find(c => c.id === selectedConfig);
          if (config) {
            const autoMappings: ColumnMapping[] = [];
            firstSheet.headers.forEach(header => {
              // 정확히 일치하는 레코드 찾기
              const exactMatch = config.records.find(
                record => record.toLowerCase() === header.toLowerCase()
              );

              if (exactMatch) {
                autoMappings.push({
                  sourceSheet: firstSheet.name,
                  sourceColumn: header,
                  targetColumn: exactMatch,
                  transformRule: 'none'
                });
              }
            });

            setMappings(autoMappings);
            saveMappingConfig({
              ...config,
              mappings: autoMappings
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading source file:', error);
      // TODO: 에러 처리
    }
  };

  // 소스 시트 선택 시
  const handleSourceSheetSelect = async (sheetName: string) => {
    setSelectedSourceSheet(sheetName);
    const fileInfo = fileInfos.find(info => info.id === selectedSourceFile);
    if (!fileInfo) return;

    try {
      // Base64 데이터를 ArrayBuffer로 변환
      const base64Data = fileInfo.data;
      const binaryData = atob(base64Data.split(',')[1]);
      const array = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        array[i] = binaryData.charCodeAt(i);
      }

      const file = new File([array], fileInfo.name, {
        type: fileInfo.type,
        lastModified: fileInfo.lastModified
      });

      const excelData = await readExcelFile(file);
      const selectedSheet = excelData.sheets.find(sheet => sheet.name === sheetName);
      if (selectedSheet) {
        setSourceHeaders(selectedSheet.headers);
      }
    } catch (error) {
      console.error('Error loading sheet:', error);
      // TODO: 에러 처리
    }
  };

  // 매핑 변경 시
  const handleMappingChange = (newMappings: ColumnMapping[]) => {
    setMappings(newMappings);
    if (selectedConfig) {
      const config = mappingConfigs.find(c => c.id === selectedConfig);
      if (config) {
        saveMappingConfig({
          ...config,
          mappings: newMappings
        });
      }
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">매핑 설정</h1>

      {/* 매핑 설정 관리 */}
      <Card>
        <CardHeader>
          <CardTitle>매핑 설정 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <MappingConfigManager onSelect={handleConfigSelect} />
        </CardContent>
      </Card>

      {selectedConfig && (
        <Card>
          <CardHeader>
            <CardTitle>소스 파일 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 소스 파일 선택 */}
            <div>
              <label className="block text-sm font-medium mb-2">파일 선택</label>
              <Select
                onValueChange={handleSourceFileSelect}
                value={selectedSourceFile || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="파일을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {fileInfos.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 시트 선택 */}
            {selectedSourceFile && (
              <div>
                <label className="block text-sm font-medium mb-2">시트 선택</label>
                <Select
                  onValueChange={handleSourceSheetSelect}
                  value={selectedSourceSheet || undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="시트를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedFileSheets.map((sheet) => (
                      <SelectItem key={sheet} value={sheet}>
                        {sheet}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 컬럼 매핑 */}
      {selectedConfig && selectedSourceFile && selectedSourceSheet && (
        <Card>
          <CardHeader>
            <CardTitle>컬럼 매핑</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <ColumnMapper
                sourceHeaders={sourceHeaders}
                targetHeaders={targetHeaders}
                currentMappings={mappings}
                onMappingChange={handleMappingChange}
                sourceSheet={selectedSourceSheet}
              />
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 