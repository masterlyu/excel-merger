import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          엑셀 파일 통합 서비스
        </h1>
        
        <p className="text-xl text-gray-600 mb-8">
          여러 보험회사의 실적자료 엑셀 파일을 손쉽게 통합하고 관리하세요.
          <br />
          단 몇 번의 클릭으로 복잡한 데이터 통합 작업을 자동화할 수 있습니다.
        </p>

        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">주요 기능</h2>
          <ul className="text-left text-gray-600 space-y-2 mb-8">
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              최대 10개의 엑셀 파일 동시 업로드
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              간편한 필드 매핑 기능
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              통합 데이터 미리보기
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              엑셀 파일 다운로드 및 인쇄
            </li>
          </ul>
        </div>

        <Link 
          href="/upload" 
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          시작하기
        </Link>
      </div>
    </div>
  );
}
