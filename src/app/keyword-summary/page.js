'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import { useAppContext } from '@/context/AppContext';

export default function KeywordSummary() {
    const router = useRouter();
    const {
        sessionId,
        keywords,
        summary,
        generateTopic,
        isLoading,
        error
    } = useAppContext();

    // 세션이 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!sessionId) {
            router.push('/');
        }
    }, [sessionId, router]);

    // 다음 버튼 클릭 시 토론 주제 생성 후 페이지 이동
    const handleNext = async () => {
        try {
            await generateTopic();
            router.push('/topic-selection');
        } catch (error) {
            console.error('토론 주제 생성 실패:', error);
        }
    };

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header
                showNav={true}
                backUrl="/"
                nextUrl={keywords.length > 0 ? null : null} // 다음 버튼은 직접 처리
                nextText="다음"
                onNext={handleNext}
            />

            <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4285F4]"></div>
                    </div>
                ) : error ? (
                    <div className="flex justify-center items-center h-full">
                        <Card>
                            <div className="text-red-500 text-center">
                                <h2 className="text-xl font-bold mb-4">오류가 발생했습니다</h2>
                                <p>{error}</p>
                                <button
                                    onClick={() => router.push('/')}
                                    className="mt-4 bg-[#4285F4] text-white py-2 px-4 rounded-lg"
                                >
                                    처음으로 돌아가기
                                </button>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 키워드 섹션 */}
                        <div className="md:col-span-1">
                            <Card title="핵심 Keyword!!" className="h-full">
                                <div className="bg-gray-100 rounded-xl p-6">
                                    {keywords.length > 0 ? (
                                        keywords.map((keyword, index) => (
                                            <div key={index} className="text-2xl text-gray-700 font-bold mb-6">
                                                {keyword}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-gray-500 text-center">키워드를 불러오는 중...</div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* 요약 섹션 */}
                        <div className="md:col-span-2">
                            <Card title="기사 내용 요약" className="h-full">
                                <div className="bg-gray-100 rounded-xl p-6">
                                    {summary ? (
                                        <p className="text-gray-700 text-lg">
                                            {summary}
                                        </p>
                                    ) : (
                                        <div className="text-gray-500 text-center">요약을 불러오는 중...</div>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}