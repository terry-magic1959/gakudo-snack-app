import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const basicAuth = request.headers.get('authorization');

    if (basicAuth) {
        const authValue = basicAuth.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');

        const expectedUser = process.env.BASIC_AUTH_USER || 'admin';
        const expectedPassword = process.env.BASIC_AUTH_PASSWORD || 'gakudo-snack';

        if (user === expectedUser && pwd === expectedPassword) {
            return NextResponse.next();
        }
    }

    return new NextResponse('Authentication required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    });
}

// すべてのパスに適用（ただし静的ファイルなどは除外する場合が多いですが、今回はアプリ全体を保護します）
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes) -> APIも保護したい場合は含める。今回は全体なので含める
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
