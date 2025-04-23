import React from 'react';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';

// 에러 타입 상수 정의
export const ERROR_TYPES = {
    NETWORK: 'NETWORK',
    API: 'API',
    VALIDATION: 'VALIDATION',
    AUTH: 'AUTH',
    SERVER: 'SERVER',
    UNKNOWN: 'UNKNOWN'
};

// 에러 타입별 메시지와 액션 정의
const errorConfig = {
    [ERROR_TYPES.NETWORK]: {
        title: '네트워크 오류',
        message: '인터넷 연결을 확인해주세요.',
        actionText: '재시도',
    },
    [ERROR_TYPES.API]: {
        title: 'API 오류',
        message: '서버 요청 중 문제가 발생했습니다.',
        actionText: '재시도',
    },
    [ERROR_TYPES.VALIDATION]: {
        title: '입력 오류',
        message: '입력한 정보를 확인해주세요.',
        actionText: '확인',
    },
    [ERROR_TYPES.AUTH]: {
        title: '인증 오류',
        message: '세션이 만료되었거나 인증에 실패했습니다.',
        actionText: '처음으로',
    },
    [ERROR_TYPES.SERVER]: {
        title: '서버 오류',
        message: '서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
        actionText: '처음으로',
    },
    [ERROR_TYPES.UNKNOWN]: {
        title: '알 수 없는 오류',
        message: '예상치 못한 오류가 발생했습니다.',
        actionText: '처음으로',
    }
};

/**
 * 에러 코드를 에러 타입으로 변환하는 함수
 */
export const getErrorTypeFromCode = (statusCode) => {
    if (!statusCode) return ERROR_TYPES.UNKNOWN;

    if (statusCode >= 500) return ERROR_TYPES.SERVER;
    if (statusCode === 401 || statusCode === 403) return ERROR_TYPES.AUTH;
    if (statusCode === 400 || statusCode === 422) return ERROR_TYPES.VALIDATION;
    if (statusCode === 404) return ERROR_TYPES.API;

    return ERROR_TYPES.UNKNOWN;
};

/**
 * 에러 객체나 메시지에서 사용자 친화적인 에러 메시지를 추출하는 함수
 */
export const getErrorMessage = (error) => {
    if (!error) return '알 수 없는 오류가 발생했습니다.';

    // error가 문자열인 경우
    if (typeof error === 'string') return error;

    // error가 객체인 경우
    if (error.message) return error.message;
    if (error.error) return error.error;

    return '알 수 없는 오류가 발생했습니다.';
};

/**
 * 에러 상태에 따라 적절한 UI를 렌더링하는 컴포넌트
 */
const ErrorHandler = ({
                          error,
                          errorType = ERROR_TYPES.UNKNOWN,
                          onRetry,
                          onGoHome,
                          className = ''
                      }) => {
    // 에러가 없으면 아무것도 렌더링하지 않음
    if (!error) return null;

    const errorMessage = getErrorMessage(error);
    const config = errorConfig[errorType] || errorConfig[ERROR_TYPES.UNKNOWN];

    // 에러 타입에 따라 적절한 액션 함수 선택
    const handleAction = () => {
        if (errorType === ERROR_TYPES.NETWORK || errorType === ERROR_TYPES.API) {
            if (onRetry) onRetry();
        } else {
            if (onGoHome) onGoHome();
        }
    };

    return (
        <Card className={`bg-red-50 ${className}`}>
            <div className="text-center py-4">
                <h3 className="text-lg font-bold text-red-600 mb-2">{config.title}</h3>
                <p className="text-red-700 mb-4">{errorMessage || config.message}</p>
                <Button
                    variant="primary"
                    onClick={handleAction}
                    className="mt-2"
                >
                    {config.actionText}
                </Button>
            </div>
        </Card>
    );
};

export default ErrorHandler;