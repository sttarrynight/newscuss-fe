'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

export default function TopicSelection() {
    const router = useRouter();

    // 상태 관리
    const [topic, setTopic] = useState('이 공에 AI가 생성한 토론 주제가 생성됩니다.');
    const [position, setPosition] = useState(null); // 'for' 또는 'against'
    const [difficulty, setDifficulty] = useState('medium'); // 'easy', 'medium', 'hard'

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
        setPosition(selectedPosition);
    };

    const handleDifficultySelect = (selectedDifficulty) => {
        setDifficulty(selectedDifficulty);
    };

    const handleNext = () => {
        if (position) {
            router.push('/discussion');
        }
    };

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header showNav={true} backUrl="/keyword-summary" nextUrl={position ? "/discussion" : null} />

            <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 토론 주제 및 입장 선택 */}
                <div className="md:col-span-2">
                    <Card title="오늘의 토론 주제" className="mb-6">
                        <div className="bg-gray-100 rounded-xl p-6 mb-6">
                            <p className="text-gray-700 italic text-lg">{topic}</p>
                        </div>

                        <p className="mb-4 font-medium">위의 주제에 대한 찬/반 입장을 선택해주세요.</p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Button
                                variant={position === 'for' ? 'selected' : 'unselected'}
                                onClick={() => handlePositionSelect('for')}
                                className="flex-1"
                            >
                                찬성하기
                            </Button>
                            <Button
                                variant={position === 'against' ? 'selected' : 'unselected'}
                                onClick={() => handlePositionSelect('against')}
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
            </main>
        </div>
    );
}