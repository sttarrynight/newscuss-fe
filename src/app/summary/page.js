'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/common/Header';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

export default function Summary() {
    const router = useRouter();

    // 요약 데이터 (실제로는 API에서 받아옴)
    const [summary, setSummary] = useState(
        '이 공에 AI가 생성한 토론 요약 내용이 표시됩니다. ' +
        '토론의 주요 논점, 각 측의 주요 주장과 근거, 그리고 전반적인 토론의 흐름을 요약합니다. ' +
        '이 요약은 두 측의 관점을 균형 있게 다루고 있으며, 토론에서 나온 중요한 논점들을 포함하고 있습니다.'
    );

    return (
        <div className="min-h-screen bg-[#E8F0FE] flex flex-col">
            <Header showNav={false} />

            <main className="flex-1 p-4 md:p-8 flex flex-col items-center max-w-3xl mx-auto">
                {/* Newscuss 로고 */}
                <h1 className="text-center text-5xl font-bold mb-8 bg-gradient-to-r from-[#4285F4] to-[#70A1FF] text-transparent bg-clip-text">
                    Newscuss
                </h1>

                <h2 className="text-2xl font-bold mb-6 text-center">오늘의 토론 요약</h2>

                <Card className="w-full mb-8">
                    <div className="bg-gray-100 rounded-xl p-6">
                        <p className="text-gray-700 whitespace-pre-line">
                            {summary}
                        </p>
                    </div>
                </Card>

                <div className="w-full mb-6">
                    <h3 className="text-center text-lg mb-4">
                        나와 다른 입장, 혹은 새로운 주제로 토론을 원하신다면?
                    </h3>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button
                            variant="primary"
                            onClick={() => router.push('/topic-selection')}
                            className="flex-1 sm:flex-initial"
                        >
                            입장 바꾸기
                        </Button>

                        <Button
                            variant="primary"
                            onClick={() => router.push('/')}
                            className="flex-1 sm:flex-initial"
                        >
                            처음으로
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}