'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';

export default function Header({
                                   showNav = false,
                                   backUrl = '/',
                                   nextUrl = null,
                                   nextText = '다음',
                                   onNext = null
                               }) {
    const pathname = usePathname();
    const { isLoading } = useAppContext();

    // Function to render logo with highlighted characters
    const renderLogo = () => (
        <h1 className="text-6xl font-bold text-[#4285F4]">
            <span className="text-[#0052CC]">N</span>ews<span className="text-[#0052CC]">c</span>uss
        </h1>
    );

    // 다음 버튼 클릭 핸들러
    const handleNextClick = (e) => {
        // 커스텀 핸들러가 있으면 사용
        if (onNext) {
            e.preventDefault();
            onNext();
        }
        // 아니면 기본 링크 동작 수행
    };

    return (
        <>
            {/* 상단 정보 */}
            <header className="w-full py-3 px-6 text-left bg-white border-b border-gray-200 text-sm text-gray-700">
                서울과학기술대학교 캡스톤디자인 Newscuss | contact: kyb20102010@seoultech.ac.kr
            </header>

            {/* 네비게이션 */}
            {showNav && (
                <nav className="flex justify-between items-center py-4 px-6">
                    <div className="w-28">
                        <Link
                            href={backUrl}
                            className="bg-[#4285F4] text-white py-2 px-6 rounded-full font-medium hover:bg-[#3367d6] transition-colors inline-block"
                        >
                            뒤로가기
                        </Link>
                    </div>

                    <div className="flex justify-center">
                        <Link href="/" className="text-center">
                            {renderLogo()}
                        </Link>
                    </div>

                    <div className="w-28 flex justify-end">
                        {nextUrl || onNext ? (
                            <Link
                                href={nextUrl || '#'}
                                onClick={handleNextClick}
                                className={`bg-[#4285F4] text-white py-2 px-6 rounded-full font-medium transition-colors ${
                                    isLoading
                                        ? 'opacity-50 cursor-not-allowed'
                                        : 'hover:bg-[#3367d6]'
                                }`}
                            >
                                {isLoading ? '처리 중...' : nextText}
                            </Link>
                        ) : (
                            <div></div> // 빈 공간 유지
                        )}
                    </div>
                </nav>
            )}
        </>
    );
}