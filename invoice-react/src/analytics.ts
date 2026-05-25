import ReactGA from 'react-ga4'

const GA_ID = import.meta.env.VITE_GA4_ID as string | undefined

if (GA_ID) {
    ReactGA.initialize(GA_ID, {
        gaOptions: { anonymizeIp: true },
    })

    ReactGA.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500,
    })
}

export {}
