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
    const [isFetchingSummary, setIsFetchingSummary] = useState(true);
    const [retryCount, setRetryCount] = useState(0);
    const [retryMessage, setRetryMessage] = useState('');
    const [maxRetryReached, setMaxRetryReached] = useState(false);

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
                // 최대 재시도 횟수 (3회)
                if (retryCount >= 3) {
                    setMaxRetryReached(true);
                    setRetryMessage('요약 생성이 여러 번 실패했습니다. 토론 내용이 너무 길거나 복잡한 경우 요약이 어려울 수 있습니다.');
                    setIsFetchingSummary(false);
                    return;
                }

                const summary = await getSummary();
                setDiscussionSummary(summary);
                setRetryMessage('');
            } catch (error) {
                console.error('토론 요약 가져오기 실패:', error);

                // 오류 메시지에 따른 적절한 안내 메시지 표시
                if (error.message && (
                    error.message.includes('토큰') ||
                    error.message.includes('rate limit') ||
                    error.message.includes('timeout') ||
                    error.message.includes('시간 초과')
                )) {
                    setRetryMessage('토론 내용이 너무 길어 요약 처리 중 지연이 발생했습니다. 잠시 후 다시 시도해 주세요.');
                } else if (error.message && error.message.includes('세션')) {
                    setRetryMessage('세션이 만료되었습니다. 처음부터 다시 시작해 주세요.');
                } else {
                    setDiscussionSummary('토론 요약을 가져오는 중 오류가 발생했습니다. 나중에 다시 시도해주세요.');
                }
            } finally {
                setIsFetchingSummary(false);
            }
        };

        fetchSummary();
    }, [sessionId, getSummary, router, retryCount]);

    // 재시도 핸들러
    const handleRetry = () => {
        if (retryCount < 3) {
            setIsFetchingSummary(true);
            setRetryCount(prev => prev + 1);
            setRetryMessage('요약을 다시 시도하고 있습니다...');
        } else {
            setMaxRetryReached(true);
            setRetryMessage('최대 재시도 횟수에 도달했습니다. 다른 방법을 시도해 주세요.');
        }
    };

    // 입장 바꾸기 처리
    const handleChangePosition = () => {
        router.push('/topic-selection');
    };

    // 처음으로 돌아가기 처리
    const handleStartOver = () => {
        resetSession();
        router.push('/');
    };

    // 메시지 직접 확인 처리 (토론 페이지로 돌아가기)
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
                            <p className="text-gray-600 text-center">
                                {retryMessage || '토론 내용을 요약하고 있습니다...'}
                            </p>
                            <p className="text-sm text-gray-500 mt-2">
                                토론 내용이 길수록 더 오래 걸릴 수 있습니다.
                            </p>
                        </div>
                    ) : error || maxRetryReached ? (
                        <div className="bg-red-50 rounded-xl p-6 mb-6 text-center">
                            <p className="text-red-600">
                                {maxRetryReached ? retryMessage : error}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                                {!maxRetryReached && (
                                    <Button
                                        variant="primary"
                                        onClick={handleRetry}
                                        className="flex-1 sm:flex-initial"
                                    >
                                        다시 시도하기
                                    </Button>
                                )}
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