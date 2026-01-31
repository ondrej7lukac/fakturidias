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
                const popup = window.open(data.url, 'Google Auth', 'width=600,height=700');

                // Helper to perform the actual session creation
                const createSession = async (code) => {
                    try {
                        console.log('[LoginGate] performLogin: Calling /auth/login with code');
                        const loginRes = await fetch('/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ code: code })
                        });

                        console.log('[LoginGate] /auth/login response status:', loginRes.status);

                        if (loginRes.ok) {
                            console.log('[LoginGate] Session created! Reloading...');
                            window.location.reload();
                            return true;
                        } else {
                            const errorText = await loginRes.text();
                            console.error('[LoginGate] Failed to create session:', errorText);
                            alert('Login failed. Please try again.');
                            return false;
                        }
                    } catch (e) {
                        console.error('[LoginGate] Login error:', e);
                        alert('Login failed. Please try again.');
                        return false;
                    }
                };

                // 1. Listen for postMessage (Primary)
                const handleMessage = async (event) => {
                    if (event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                        console.log('[LoginGate] OAuth success via postMessage! Code received.');
                        window.removeEventListener('message', handleMessage);
                        // Clean up poller
                        if (poller) clearInterval(poller);

                        popup?.close();
                        createSession(event.data.code);
                    }
                };
                window.addEventListener('message', handleMessage);

                // 2. Poll LocalStorage (Fallback for when window.opener is broken)
                const poller = setInterval(() => {
                    try {
                        const stored = localStorage.getItem('google_handoff_code');
                        if (stored) {
                            const { code, timestamp } = JSON.parse(stored);

                            // Only accept if very recent (prevent loops)
                            if (Date.now() - timestamp < 10000) {
                                console.log('[LoginGate] OAuth success via LocalStorage! Code found.');

                                // Consumed - remove it immediately
                                localStorage.removeItem('google_handoff_code');

                                clearInterval(poller);
                                window.removeEventListener('message', handleMessage);
                                popup?.close();

                                createSession(code);
                            } else {
                                // Stale token, clear it
                                localStorage.removeItem('google_handoff_code');
                            }
                        }

                        if (popup.closed) {
                            // Give it a moment to write to LS if it just closed
                            setTimeout(() => {
                                clearInterval(poller);
                            }, 5000);
                        }
                    } catch (e) {
                        console.error('[LoginGate] Poller error:', e);
                    }
                }, 1000);
            }
        } catch (e) {
            alert('Failed to start authentication');
        }
    };

    if (authState.loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                fontFamily: 'system-ui, sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{
                        width: '40px',
                        height: '40px',
                        border: '4px solid rgba(0,0,0,0.1)',
                        borderTop: '4px solid #4285f4',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 20px'
                    }}></div>
                    <p style={{ color: '#666' }}>Loading...</p>
                </div>
            </div>
        );
    }

    if (!authState.authenticated) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <div style={{
                    background: 'white',
                    padding: '60px 50px',
                    borderRadius: '16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    textAlign: 'center',
                    maxWidth: '400px',
                    width: '90%'
                }}>
                    <h1 style={{
                        fontSize: '32px',
                        marginBottom: '10px',
                        color: '#333',
                        fontWeight: '700'
                    }}>Fakturidias</h1>
                    <p style={{
                        fontSize: '16px',
                        color: '#666',
                        marginBottom: '40px'
                    }}>Professional Invoice Management</p>

                    <button
                        onClick={handleLogin}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            width: '100%',
                            padding: '16px 24px',
                            fontSize: '16px',
                            fontWeight: '600',
                            background: 'white',
                            color: '#333',
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            margin: '0 auto'
                        }}
                        onMouseOver={(e) => {
                            e.target.style.background = '#f8f9fa';
                            e.target.style.borderColor = '#4285f4';
                        }}
                        onMouseOut={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.borderColor = '#ddd';
                        }}
                    >
                        <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                            <path fill="none" d="M0 0h48v48H0z" />
                        </svg>
                        Sign in with Google
                    </button>

                    <p style={{
                        marginTop: '30px',
                        fontSize: '13px',
                        color: '#999'
                    }}>
                        Secure authentication via Google OAuth2
                    </p>
                </div>

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
