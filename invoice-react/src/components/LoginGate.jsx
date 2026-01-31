import { useState, useEffect } from 'react';

export default function LoginGate({ children }) {
    const [authState, setAuthState] = useState({
        loading: true,
        authenticated: false,
        email: null
    });

    useEffect(() => {
        // Check session status on mount
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const res = await fetch('/auth/session');
            const data = await res.json();
            setAuthState({
                loading: false,
                authenticated: data.authenticated || false,
                email: data.email || null
            });
        } catch (e) {
            console.error('Session check failed:', e);
            setAuthState({
                loading: false,
                authenticated: false,
                email: null
            });
        }
    };

    const handleLogin = async () => {
        try {
            const res = await fetch('/auth/google/url');
            const data = await res.json();
            if (data.url) {
                // Simple Redirect Flow (No Popups)
                window.location.href = data.url;
            }
        } catch (e) {
            alert('Failed to start authentication');
        }
    };

    if (authState.loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {children}

            {!authState.authenticated && (
                <div className="fixed bottom-6 right-6 z-50">
                    <button
                        onClick={handleLogin}
                        className="bg-white text-gray-800 font-semibold py-3 px-6 rounded-full shadow-xl border border-gray-200 flex items-center gap-3 hover:bg-gray-50 hover:scale-105 transition-all duration-200"
                    >
                        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                        <span>Sign in to Save</span>
                    </button>
                </div>
            )}
        </>
    );
}
