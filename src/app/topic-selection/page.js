'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import { useAppContext } from '@/context/AppContext';

export default function TopicSelection() {
    const router = useRouter();
    const {
        sessionId,
        topic,
        topicDescription,
        userPosition,
        setUserPosition,
        difficulty,
        setDifficulty,
        startDiscussion,
        isLoading,
        error
    } = useAppContext();

    // 세션이 없으면 홈으로 리다이렉트
    useEffect(() => {
        if (!sessionId || !topic) {
            router.push('/keyword-summary');
        }
    }, [sessionId, topic, router]);

    // 난이도 정보
    const difficultyInfo = {
        easy: {
            title: '초급',
            description: '아직 토론이 어렵다!'
        },
        medium: {
            title: '중급',
            description: '나는 토론을 즐긴다!'
        },
        hard: {
            title: '고급',
            description: 'AI도 나를 못이긴다!'
        }
    };

    const handlePositionSelect = (selectedPosition) => {
        setUserPosition(selectedPosition);
    };

    const handleDifficultySelect = (selectedDifficulty) => {
        setDifficulty(selectedDifficulty);
    };

    const handleNext = async () => {
        if (userPosition) {
            try {
                await startDiscussion(userPosition, difficulty);
                router.push('/discussion');
            } catch (error) {
                console.error('토론 시작 실패:', error);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header showNav={true} backUrl="/keyword-summary" onNext={userPosition ? handleNext : null} />

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
                                    onClick={() => router.push('/keyword-summary')}
                                    className="mt-4 bg-[#4285F4] text-white py-2 px-4 rounded-lg"
                                >
                                    이전 단계로 돌아가기
                                </button>
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* 토론 주제 및 입장 선택 */}
                        <div className="md:col-span-2">
                            <Card title="오늘의 토론 주제" className="mb-6">
                                <div className="bg-gray-100 rounded-xl p-6 mb-6">
                                    <p className="text-gray-700 italic text-lg mb-4">{topic}</p>
                                    {topicDescription && (
                                        <p className="text-gray-600 text-sm">{topicDescription}</p>
                                    )}
                                </div>

                                <p className="mb-4 font-medium text-gray-800">위의 주제에 대한 찬/반 입장을 선택해주세요.</p>

                                <div className="flex flex-col sm:flex-row gap-4">
                                    <Button
                                        variant={userPosition === '찬성' ? 'selected' : 'unselected'}
                                        onClick={() => handlePositionSelect('찬성')}
                                        className="flex-1"
                                    >
                                        찬성하기
                                    </Button>
                                    <Button
                                        variant={userPosition === '반대' ? 'selected' : 'unselected'}
                                        onClick={() => handlePositionSelect('반대')}
                                        className="flex-1"
                                    >
                                        반대하기
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        {/* 난이도 설정 */}
                        <div className="md:col-span-1">
                            <Card title="토론 난이도 설정">
                                {Object.entries(difficultyInfo).map(([key, { title, description }]) => (
                                    <div
                                        key={key}
                                        className={`p-4 mb-4 rounded-xl cursor-pointer transition-all ${
                                            difficulty === key
                                                ? 'border-2 border-[#4285F4] bg-blue-50'
                                                : 'bg-gray-100'
                                        }`}
                                        onClick={() => handleDifficultySelect(key)}
                                    >
                                        <h3 className="font-bold text-lg">{title}</h3>
                                        <p className="text-sm text-gray-600">{description}</p>
                                    </div>
                                ))}
                            </Card>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}