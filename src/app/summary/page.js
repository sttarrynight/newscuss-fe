'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { useAppContext } from '@/context/AppContext';

export default function Summary() {
    const router = useRouter();
    const [discussionSummary, setDiscussionSummary] = useState('');
    const [isFetchingSummary, setIsFetchingSummary] = useState(true);

    const {
        sessionId,
        topic,
        userPosition,
        aiPosition,
        getSummary,
        resetSession,
        isLoading,
        error
    } = useAppContext();

    // 세션이 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!sessionId) {
            router.push('/');
            return;
        }

        // 토론 요약 가져오기
        const fetchSummary = async () => {
            setIsFetchingSummary(true);
            try {
                const summary = await getSummary();
                setDiscussionSummary(summary);
            } catch (error) {
                console.error('토론 요약 가져오기 실패:', error);
                setDiscussionSummary('토론 요약을 가져오는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
            } finally {
                setIsFetchingSummary(false);
            }
        };

        fetchSummary();
    }, [sessionId, getSummary, router]);

    // 입장 바꾸기 처리
    const handleChangePosition = () => {
        router.push('/topic-selection');
    };

    // 처음으로 돌아가기 처리
    const handleStartOver = () => {
        resetSession();
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header showNav={false} />

            <main className="flex-1 p-4 md:p-8 flex flex-col items-center max-w-3xl mx-auto">
                {/* Newscuss 로고 */}
                <h1 className="text-center text-5xl font-bold mb-8 text-[#4285F4]">
                    <span className="text-[#0052CC]">N</span>ews<span className="text-[#0052CC]">c</span>uss
                </h1>

                <Card className="w-full mb-8">
                    <h2 className="text-2xl font-bold mb-6 text-center">오늘의 토론 요약</h2>

                    {isFetchingSummary ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4285F4]"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 rounded-xl p-6 mb-6 text-center">
                            <p className="text-red-600">
                                {error}
                            </p>
                            <Button
                                variant="primary"
                                onClick={handleStartOver}
                                className="mt-4"
                            >
                                처음으로 돌아가기
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className="bg-gray-100 rounded-xl p-6 mb-6">
                                {topic && (
                                    <div className="mb-4">
                                        <h3 className="font-bold text-lg mb-2">토론 주제:</h3>
                                        <p className="text-gray-700 italic">{topic}</p>
                                    </div>
                                )}

                                {userPosition && aiPosition && (
                                    <div className="mb-4">
                                        <h3 className="font-bold text-lg mb-2">토론 입장:</h3>
                                        <p className="text-gray-700">
                                            사용자: <span className="font-medium text-blue-600">{userPosition}</span> /
                                            AI: <span className="font-medium text-red-600">{aiPosition}</span>
                                        </p>
                                    </div>
                                )}

                                <h3 className="font-bold text-lg mb-2">토론 요약:</h3>
                                <p className="text-gray-700 whitespace-pre-line">
                                    {discussionSummary}
                                </p>
                            </div>

                            <div className="border-t border-gray-200 pt-6 mt-2">
                                <h3 className="text-center text-lg mb-6">
                                    나와 다른 입장, 혹은 새로운 주제로 토론을 원하신다면?
                                </h3>

                                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                    <Button
                                        variant="primary"
                                        onClick={handleChangePosition}
                                        className="flex-1 sm:flex-initial"
                                    >
                                        입장 바꾸기
                                    </Button>

                                    <Button
                                        variant="primary"
                                        onClick={handleStartOver}
                                        className="flex-1 sm:flex-initial"
                                    >
                                        처음으로
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </Card>
            </main>
        </div>
    );
}