'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import FeedbackModal from '@/components/feedback/FeedbackModal';
import { useAppContext } from '@/context/AppContext';

export default function Summary() {
    const router = useRouter();
    const [discussionSummary, setDiscussionSummary] = useState('');
    const [isFetchingSummary, setIsFetchingSummary] = useState(false);
    const [summaryError, setSummaryError] = useState('');
    const [showFeedbackModal, setShowFeedbackModal] = useState(false); // 피드백 모달 상태

    const {
        sessionId,
        topic,
        userPosition,
        aiPosition,
        resetSession,
        getCachedSummary,
        summaryStatus,
        startBackgroundSummary,
        // 피드백 관련
        feedbackData,
        isFeedbackLoading,
        feedbackError,
        getFeedback
    } = useAppContext();

    // 입장별 색상 결정 함수 (discussion 페이지와 동일)
    const getPositionColor = (position) => {
        return position === '찬성' ? 'text-blue-500' : 'text-red-500';
    };

    // 세션이 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!sessionId) {
            router.push('/');
            return;
        }

        // 캐시된 요약 확인 및 처리
        const initializeSummary = async () => {
            const cachedSummary = getCachedSummary();

            if (cachedSummary) {
                // 이미 완료된 요약이 있으면 바로 표시
                setDiscussionSummary(cachedSummary);
                setIsFetchingSummary(false);
                return;
            }

            if (summaryStatus === 'SUMMARIZING') {
                // 현재 요약 중이면 대기 상태로 설정
                setIsFetchingSummary(true);

                // 간단한 폴링으로 완료 대기 (5초마다 확인, 최대 60초)
                let attempts = 0;
                const maxAttempts = 12; // 60초 / 5초

                const checkSummary = setInterval(() => {
                    const newCachedSummary = getCachedSummary();
                    attempts++;

                    if (newCachedSummary) {
                        setDiscussionSummary(newCachedSummary);
                        setIsFetchingSummary(false);
                        clearInterval(checkSummary);
                    } else if (attempts >= maxAttempts) {
                        setIsFetchingSummary(false);
                        setSummaryError('요약 생성 시간이 초과되었습니다.');
                        clearInterval(checkSummary);
                    }
                }, 5000);

                return () => clearInterval(checkSummary);
            }

            if (summaryStatus === 'PENDING' || summaryStatus === 'FAILED') {
                // 요약이 아직 시작되지 않았거나 실패한 경우 시작
                setIsFetchingSummary(true);
                setSummaryError('');

                try {
                    const summary = await startBackgroundSummary();
                    setDiscussionSummary(summary);
                } catch (error) {
                    console.error('토론 요약 가져오기 실패:', error);
                    setSummaryError(error.message || '토론 요약을 가져오는 중 오류가 발생했습니다.');
                } finally {
                    setIsFetchingSummary(false);
                }
            }
        };

        initializeSummary();
    }, [sessionId, router, summaryStatus, getCachedSummary, startBackgroundSummary]);

    // 수동 재시도 핸들러
    const handleRetry = async () => {
        setSummaryError('');
        setDiscussionSummary('');
        setIsFetchingSummary(true);

        try {
            const summary = await startBackgroundSummary();
            setDiscussionSummary(summary);
        } catch (error) {
            console.error('재시도 실패:', error);
            setSummaryError(error.message || '토론 요약을 가져오는 중 오류가 발생했습니다.');
        } finally {
            setIsFetchingSummary(false);
        }
    };

    const handleChangePosition = () => {
        router.push('/topic-selection');
    };

    const handleStartOver = () => {
        resetSession();
        router.push('/');
    };

    // 읽기 전용으로 대화 내역 보기
    const handleViewMessages = () => {
        router.push('/discussion?readonly=true');
    };

    // 피드백 모달 열기
    const handleShowFeedback = async () => {
        setShowFeedbackModal(true);

        // 이미 피드백 데이터가 있으면 API 호출하지 않음
        if (!feedbackData) {
            try {
                await getFeedback();
            } catch (error) {
                console.error('피드백 가져오기 실패:', error);
                // 에러가 발생해도 모달은 열어서 에러 메시지를 표시
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header showNav={false} />

            <main className="flex-1 p-4 md:p-8 flex flex-col items-center max-w-4xl mx-auto">
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
                                    대화 내역 보기
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
                                            사용자: <span className={`font-medium ${getPositionColor(userPosition)}`}>{userPosition}</span> /
                                            AI: <span className={`font-medium ${getPositionColor(aiPosition)}`}>{aiPosition}</span>
                                        </p>
                                    </div>
                                )}

                                <h3 className="font-bold text-lg mb-3">토론 요약:</h3>
                                {discussionSummary ? (
                                    <div className="text-gray-700 leading-relaxed prose prose-gray max-w-none">
                                        <ReactMarkdown
                                            components={{
                                                // 커스텀 스타일링
                                                h1: ({children}) => <h1 className="text-xl font-bold text-gray-800 mt-4 mb-3">{children}</h1>,
                                                h2: ({children}) => <h2 className="text-lg font-semibold text-gray-800 mt-4 mb-2">{children}</h2>,
                                                h3: ({children}) => <h3 className="text-base font-medium text-gray-800 mt-3 mb-2">{children}</h3>,
                                                p: ({children}) => <p className="text-gray-700 mb-3 leading-relaxed">{children}</p>,
                                                strong: ({children}) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                                em: ({children}) => <em className="italic text-gray-800">{children}</em>,
                                                ul: ({children}) => <ul className="list-disc list-inside mb-3 text-gray-700 space-y-1">{children}</ul>,
                                                ol: ({children}) => <ol className="list-decimal list-inside mb-3 text-gray-700 space-y-1">{children}</ol>,
                                                li: ({children}) => <li className="ml-2">{children}</li>,
                                                code: ({children}) => <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono text-gray-800">{children}</code>,
                                                blockquote: ({children}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-3">{children}</blockquote>
                                            }}
                                        >
                                            {discussionSummary}
                                        </ReactMarkdown>
                                    </div>
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
                                        variant="secondary"
                                        onClick={handleShowFeedback}
                                        className="flex-1 sm:flex-initial"
                                    >
                                        🎯 내 토론 점수 보기
                                    </Button>

                                    <Button
                                        variant="secondary"
                                        onClick={handleViewMessages}
                                        className="flex-1 sm:flex-initial"
                                    >
                                        토론 대화 다시보기
                                    </Button>

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

                {/* 피드백 모달 */}
                <FeedbackModal
                    isOpen={showFeedbackModal}
                    onClose={() => setShowFeedbackModal(false)}
                    feedbackData={feedbackData}
                    isLoading={isFeedbackLoading}
                    error={feedbackError}
                />
            </main>
        </div>
    );
}