'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Check, X, AlertTriangle } from 'lucide-react';
import { MappingConfig, loadMappingConfigById, getActiveMappingConfigId } from '@/lib/mapping';
import { ValidationIndicator } from './ValidationIndicator';
import { validateMappingConfig } from '@/lib/validation';

// 로컬 스토리지 키
const REQUIRED_FIELDS_KEY = 'excel_merger_required_fields';

/**
 * 필수 필드 설정 인터페이스
 */
interface RequiredFieldConfig {
  fields: RequiredField[];
}

/**
 * 필수 필드 인터페이스
 */
interface RequiredField {
  name: string;
  description?: string;
}

/**
 * 필수 필드 설정 컴포넌트 속성
 */
interface RequiredFieldConfigProps {
  onValidationChange?: (isValid: boolean) => void;
}

/**
 * 필수 필드 관리 컴포넌트
 * 필수 타겟 필드를 설정하고 관리합니다.
 */
export default function RequiredFieldConfigComponent({ onValidationChange }: RequiredFieldConfigProps) {
  // 상태 관리
  const [requiredFields, setRequiredFields] = useState<RequiredField[]>([]);
  const [newFieldName, setNewFieldName] = useState<string>('');
  const [activeMappingConfig, setActiveMappingConfig] = useState<MappingConfig | null>(null);
  const [validationResults, setValidationResults] = useState<{
    isValid: boolean;
    missingFields: string[];
  }>({ isValid: true, missingFields: [] });
  const [autoValidate, setAutoValidate] = useState<boolean>(true);

  // 필수 필드 설정 로드
  useEffect(() => {
    loadRequiredFields();
    loadActiveMappingConfig();
  }, []);

  // 활성 매핑 설정이 변경될 때마다 유효성 검증
  useEffect(() => {
    if (activeMappingConfig && autoValidate) {
      validateMapping();
    }
  }, [activeMappingConfig, requiredFields, autoValidate]);

  // 필수 필드 설정 로드
  const loadRequiredFields = () => {
    try {
      const configJson = localStorage.getItem(REQUIRED_FIELDS_KEY);
      if (configJson) {
        const config = JSON.parse(configJson) as RequiredFieldConfig;
        setRequiredFields(config.fields || []);
      }
    } catch (error) {
      console.error('필수 필드 설정을 로드하는 중 오류 발생:', error);
      setRequiredFields([]);
    }
  };

  // 활성 매핑 설정 로드
  const loadActiveMappingConfig = () => {
    const activeId = getActiveMappingConfigId();
    if (activeId) {
      const config = loadMappingConfigById(activeId);
      setActiveMappingConfig(config);
    }
  };

  // 필수 필드 설정 저장
  const saveRequiredFields = (fields: RequiredField[]) => {
    try {
      const config: RequiredFieldConfig = { fields };
      localStorage.setItem(REQUIRED_FIELDS_KEY, JSON.stringify(config));
      
      // 저장 후 유효성 검증
      if (autoValidate) {
        validateMapping(fields);
      }
    } catch (error) {
      console.error('필수 필드 설정을 저장하는 중 오류 발생:', error);
    }
  };

  // 필수 필드 추가
  const addRequiredField = () => {
    if (!newFieldName.trim()) return;
    
    // 중복 확인
    if (requiredFields.some(field => field.name.toLowerCase() === newFieldName.trim().toLowerCase())) {
      alert('이미 존재하는 필드명입니다.');
      return;
    }
    
    const updatedFields = [
      ...requiredFields,
      { name: newFieldName.trim() }
    ];
    
    setRequiredFields(updatedFields);
    saveRequiredFields(updatedFields);
    setNewFieldName('');
  };

  // 필수 필드 제거
  const removeRequiredField = (fieldName: string) => {
    const updatedFields = requiredFields.filter(field => field.name !== fieldName);
    setRequiredFields(updatedFields);
    saveRequiredFields(updatedFields);
  };

  // 매핑 유효성 검증
  const validateMapping = (fields?: RequiredField[]) => {
    const fieldsToValidate = fields || requiredFields;
    
    if (!activeMappingConfig || fieldsToValidate.length === 0) {
      setValidationResults({ isValid: true, missingFields: [] });
      if (onValidationChange) onValidationChange(true);
      return;
    }
    
    const fieldNames = fieldsToValidate.map(f => f.name);
    const validationResult = validateMappingConfig(activeMappingConfig, fieldNames);
    
    // 누락된 필드 찾기
    const missingFields = validationResult.errors
      .filter(error => error.type === 'missing_target' || error.type === 'missing_source')
      .map(error => error.field || '알 수 없는 필드');
    
    const isValid = missingFields.length === 0;
    
    setValidationResults({ isValid, missingFields });
    
    if (onValidationChange) onValidationChange(isValid);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>필수 필드 설정</CardTitle>
            <CardDescription>
              매핑 시 반드시 포함되어야 하는 필드를 설정합니다
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {activeMappingConfig && (
              <ValidationIndicator 
                validationResult={validateMappingConfig(
                  activeMappingConfig, 
                  requiredFields.map(f => f.name)
                )} 
                size="sm"
              />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 자동 검증 설정 */}
        <div className="flex items-center space-x-2">
          <Switch 
            id="auto-validate" 
            checked={autoValidate} 
            onCheckedChange={setAutoValidate} 
          />
          <Label htmlFor="auto-validate">자동 유효성 검증</Label>
        </div>
        
        {/* 필드 추가 폼 */}
        <div className="flex gap-2">
          <Input
            placeholder="필수 필드명 입력"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            className="flex-1"
          />
          <Button onClick={addRequiredField} disabled={!newFieldName.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            추가
          </Button>
        </div>
        
        {/* 필수 필드 목록 */}
        {requiredFields.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">필수 필드 목록</h3>
            <div className="flex flex-wrap gap-2">
              {requiredFields.map((field) => (
                <Badge 
                  key={field.name} 
                  variant="outline"
                  className={`px-2 py-1 ${
                    validationResults.missingFields.includes(field.name)
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-green-200 bg-green-50 text-green-700'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {validationResults.missingFields.includes(field.name) ? (
                      <AlertTriangle className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    {field.name}
                    <button
                      onClick={() => removeRequiredField(field.name)}
                      className="ml-1 rounded-full hover:bg-red-100 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            설정된 필수 필드가 없습니다. 필드를 추가하세요.
          </p>
        )}
        
        {/* 유효성 검증 결과 */}
        {requiredFields.length > 0 && autoValidate && !validationResults.isValid && (
          <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">필수 필드 검증 오류</p>
                <ul className="list-disc list-inside mt-1">
                  {validationResults.missingFields.map((field) => (
                    <li key={field}>
                      <span className="font-medium">{field}</span> 필드가 매핑되지 않았거나 소스 필드가 없습니다.
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* 수동 검증 버튼 */}
        {!autoValidate && (
          <Button variant="secondary" onClick={() => validateMapping()}>
            <Check className="mr-1 h-4 w-4" />
            지금 검증
          </Button>
        )}
      </CardContent>
    </Card>
  );
} 