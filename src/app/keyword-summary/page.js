'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';

export default function KeywordSummary() {
    const router = useRouter();

    // 실제로는 API에서 받아올 데이터
    const [keywordData, setKeywordData] = useState({
        keywords: ['키워드1', '키워드2', '키워드3'],
        summary: '이 공에 요약 텍스트가 표시됩니다. 실제 API 연동 시에는 뉴스 기사의 내용을 요약한 텍스트가 표시될 예정입니다.'
    });

    // 로딩 상태 (실제 API 연동 시 활용)
    const [isLoading, setIsLoading] = useState(false);

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header showNav={true} backUrl="/" nextUrl="/topic-selection" />

            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* 키워드 섹션 */}
                    <div className="md:col-span-1">
                        <Card title="핵심 Keyword!!" className="h-full">
                            <div className="bg-gray-100 rounded-xl p-6">
                                {keywordData.keywords.map((keyword, index) => (
                                    <div key={index} className="text-2xl text-gray-700 font-bold mb-6">
                                        {keyword}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* 요약 섹션 */}
                    <div className="md:col-span-2">
                        <Card title="기사 내용 요약" className="h-full">
                            <div className="bg-gray-100 rounded-xl p-6">
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-40">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4285F4]"></div>
                                    </div>
                                ) : (
                                    <p className="text-gray-700 text-lg">
                                        {keywordData.summary}
                                    </p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}