'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header({ showNav = false, backUrl = '/', nextUrl = null, nextText = '다음' }) {
    const pathname = usePathname();

    return (
        <>
            {/* 상단 정보 */}
            <header className="w-full p-3 text-center border-b border-gray-200 text-sm text-gray-700">
                서울과학기술대학교 캡스톤디자인 Newscuss | contact: kyb20102010@seoultech.ac.kr
            </header>

            {/* 네비게이션 */}
            {showNav && (
                <nav className="flex justify-between items-center p-4 max-w-6xl mx-auto">
                    <Link
                        href={backUrl}
                        className="bg-[#4285F4] text-white py-2 px-6 rounded-full font-medium hover:bg-[#3367d6] transition-colors"
                    >
                        뒤로가기
                    </Link>

                    <Link href="/" className="text-4xl font-bold bg-gradient-to-r from-[#4285F4] to-[#70A1FF] text-transparent bg-clip-text">
                        Newscuss
                    </Link>

                    {nextUrl && (
                        <Link
                            href={nextUrl}
                            className="bg-[#4285F4] text-white py-2 px-6 rounded-full font-medium hover:bg-[#3367d6] transition-colors"
                        >
                            {nextText}
                        </Link>
                    )}
                </nav>
            )}
        </>
    );
}