import React, { useState } from 'react';

export default function LoginPage({ lang, onLoginSuccess }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/auth/google/url');
            if (!res.ok) throw new Error('Failed to start login');
            const data = await res.json();

            if (data.url) {
                // Open Popup
                const width = 500;
                const height = 600;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;

                window.open(
                    data.url,
                    'Google Login',
                    `width=${width},height=${height},top=${top},left=${left}`
                );

                // Listen for message
                const handleMessage = (event) => {
                    if (event.data && event.data.type === 'GOOGLE_LOGIN_SUCCESS') {
                        window.removeEventListener('message', handleMessage);
                        onLoginSuccess(event.data.email);
                    }
                };
                window.addEventListener('message', handleMessage);
            }
        } catch (e) {
            console.error(e);
            setError('Failed to connect to login server.');
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'var(--bg)',
            color: 'var(--text)',
            padding: '20px'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '40px 30px' }}>
                <h1 style={{ marginBottom: '10px', fontSize: '2rem' }}>Invoice Maker</h1>
                <p style={{ color: 'var(--muted)', marginBottom: '30px' }}>
                    {lang === 'cs' ? 'Přihlaste se pro přístup k fakturám' : 'Log in to manage your invoices'}
                </p>

                {error && <div style={{ color: 'var(--danger)', marginBottom: '20px' }}>{error}</div>}

                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="primary"
                    style={{
                        width: '100%',
                        fontSize: '1.1rem',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px'
                    }}
                >
                    {isLoading ? '...' : (
                        <>
                            <span>G</span> {lang === 'cs' ? 'Přihlásit přes Google' : 'Log in with Google'}
                        </>
                    )}
                </button>
            </div>

            <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                Secure Login via Google OAuth2
            </p>
        </div>
    );
}
