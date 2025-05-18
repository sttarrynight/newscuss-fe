'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { useAppContext } from '@/context/AppContext';

export default function Summary() {
    const router = useRouter();
    const [discussionSummary, setDiscussionSummary] = useState('');
    const [isFetchingSummary, setIsFetchingSummary] = useState(false);
    const [summaryError, setSummaryError] = useState('');
    const [fetchAttempted, setFetchAttempted] = useState(false); // 중요: 한 번만 시도

    const {
        sessionId,
        topic,
        userPosition,
        aiPosition,
        resetSession,
        error,
        // 새로 추가
        getCachedSummary,
        summaryStatus,
        summaryProgress,
        startBackgroundSummary
    } = useAppContext();

    // 세션이 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!sessionId) {
            router.push('/');
            return;
        }

        // 즉시 캐시된 요약 확인
        const cachedSummary = getCachedSummary();
        if (cachedSummary) {
            setDiscussionSummary(cachedSummary);
            setIsFetchingSummary(false);
            return;
        }

        // 캐시된 요약이 없고 현재 요약 중인 경우
        if (summaryStatus === 'SUMMARIZING') {
            setIsFetchingSummary(true);
            // 요약 완료를 기다리는 폴링 로직
            const pollForSummary = setInterval(() => {
                const newCachedSummary = getCachedSummary();
                if (newCachedSummary) {
                    setDiscussionSummary(newCachedSummary);
                    setIsFetchingSummary(false);
                    clearInterval(pollForSummary);
                }
            }, 1000);

            // 30초 후 타임아웃
            setTimeout(() => {
                clearInterval(pollForSummary);
                if (!discussionSummary) {
                    setIsFetchingSummary(false);
                    setSummaryError('요약 생성 시간이 초과되었습니다.');
                }
            }, 30000);

            return () => clearInterval(pollForSummary);
        }

        // 캐시된 요약이 없으면 한 번만 시도
        if (!fetchAttempted && summaryStatus !== 'COMPLETED') {
            setFetchAttempted(true);
            setIsFetchingSummary(true);
            setSummaryError('');

            startBackgroundSummary()
                .then(summary => {
                    setDiscussionSummary(summary);
                })
                .catch(error => {
                    console.error('토론 요약 가져오기 실패:', error);
                    setSummaryError(error.message || '토론 요약을 가져오는 중 오류가 발생했습니다.');
                })
                .finally(() => {
                    setIsFetchingSummary(false);
                });
        }
    }, [sessionId, router, fetchAttempted, summaryStatus, getCachedSummary, startBackgroundSummary, discussionSummary]);

    // 수동 재시도 핸들러
    const handleRetry = () => {
        setFetchAttempted(false); // 재시도 플래그 리셋
        setSummaryError('');
        setDiscussionSummary('');
    };

    // 나머지 핸들러들은 동일...
    const handleChangePosition = () => {
        router.push('/topic-selection');
    };

    const handleStartOver = () => {
        resetSession();
        router.push('/');
    };

    const handleViewMessages = () => {
        router.push('/discussion');
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
                        <div className="flex flex-col justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4285F4] mb-4"></div>
                            <p className="text-gray-600 text-center">토론 내용을 요약하고 있습니다...</p>
                            {summaryStatus === 'SUMMARIZING' && summaryProgress > 0 && (
                                <div className="w-full max-w-md mt-4">
                                    <div className="bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-[#4285F4] h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${summaryProgress}%` }}
                                        ></div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2 text-center">{summaryProgress}% 완료</p>
                                </div>
                            )}
                            <p className="text-sm text-gray-500 mt-2">
                                토론 내용이 길수록 더 오래 걸릴 수 있습니다.
                            </p>
                        </div>
                    ) : summaryError ? (
                        <div className="bg-red-50 rounded-xl p-6 mb-6 text-center">
                            <p className="text-red-600 mb-4">{summaryError}</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button
                                    variant="primary"
                                    onClick={handleRetry}
                                    className="flex-1 sm:flex-initial"
                                >
                                    다시 시도하기
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={handleViewMessages}
                                    className="flex-1 sm:flex-initial"
                                >
                                    메시지 직접 확인
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={handleStartOver}
                                    className="flex-1 sm:flex-initial"
                                >
                                    처음으로 돌아가기
                                </Button>
                            </div>
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
                                {discussionSummary ? (
                                    <p className="text-gray-700 whitespace-pre-line">
                                        {discussionSummary}
                                    </p>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-gray-500">토론 요약을 가져오는데 문제가 발생했습니다.</p>
                                        <Button
                                            variant="primary"
                                            onClick={handleRetry}
                                            className="mt-4"
                                        >
                                            다시 시도하기
                                        </Button>
                                    </div>
                                )}
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