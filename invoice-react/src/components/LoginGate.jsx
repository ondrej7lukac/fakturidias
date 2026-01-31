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
            <div style={{
                Sign in with Google
                    </button>

                <p style={{
                    marginTop: '30px',
                    fontSize: '13px',
                    color: '#999'
                }}>
                    Secure authentication via Google OAuth2
                </p>
                </ div>

                <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    // User is authenticated - render the main app
    return <>{children}</>;
}
