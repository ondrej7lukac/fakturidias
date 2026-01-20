/**
 * Czech Bank Codes and IBAN Utilities
 */

export const BANK_CODES = {
    '0100': { name: 'Komerční banka', bic: 'KOMB CZ PP' },
    '0300': { name: 'ČSOB', bic: 'CEKO CZ PP' },
    '0600': { name: 'MONETA Money Bank', bic: 'AGBA CZ PP' },
    '0710': { name: 'Česká národní banka', bic: 'CNBA CZ PP' },
    '0800': { name: 'Česká spořitelna', bic: 'CSAS CZ PP' },
    '2010': { name: 'Fio banka', bic: 'FIOB CZ PP' },
    '2020': { name: 'MUFG Bank', bic: 'BOTK CZ PP' },
    '2100': { name: 'Hypoteční banka', bic: 'HYPO CZ PP' },
    '2200': { name: 'Peněžní dům', bic: 'PEND CZ PP' },
    '2220': { name: 'Artesa, spořitelní družstvo', bic: 'ARTZ CZ PP' },
    '2240': { name: 'Ney spořitelní družstvo', bic: 'WPBK CZ PP' },
    '2250': { name: 'Záložna Přerov', bic: 'ZPOC CZ PP' },
    '2260': { name: 'Moravský Peněžní Ústav', bic: 'MPUC CZ PP' },
    '2600': { name: 'Citibank', bic: 'CITI CZ PX' },
    '2700': { name: 'UniCredit Bank', bic: 'BACX CZ PP' },
    '3030': { name: 'Air Bank', bic: 'AIRB CZ PP' },
    '3050': { name: 'BNP Paribas Personal Finance', bic: 'CEPH CZ PP' },
    '3060': { name: 'PKO BP', bic: 'PKOB CZ PP' },
    '3500': { name: 'Ing Bank', bic: 'INGB CZ PP' },
    '4000': { name: 'Expobank', bic: 'BAIC CZ PP' },
    '4300': { name: 'ČMRZB', bic: 'CMZR CZ PP' },
    '5500': { name: 'Raiffeisenbank', bic: 'RZBC CZ PP' },
    '5800': { name: 'J&T Banka', bic: 'JTIB CZ PP' },
    '6000': { name: 'PPF banka', bic: 'PPFB CZ PP' },
    '6100': { name: 'Equa bank', bic: 'EQBK CZ PP' },
    '6200': { name: 'Commerzbank', bic: 'COBA CZ PP' },
    '6210': { name: 'mBank', bic: 'BREV CZ PP' },
    '6300': { name: 'BNP Paribas Fortis', bic: 'GEBA CZ PP' },
    '6700': { name: 'VUB banka', bic: 'SUBB CZ PP' },
    '6800': { name: 'Sberbank', bic: 'SBER CZ PP' },
    '7910': { name: 'Deutsche Bank', bic: 'DEUT CZ PP' },
    '7940': { name: 'Waldviertler Sparkasse Bank', bic: 'WSPK CZ PP' },
    '7950': { name: 'Oberbank', bic: 'OBKL CZ PP' },
    '7960': { name: 'CSOB stavební spořitelna', bic: 'PYRR CZ PP' },
    '7970': { name: 'Wüstenrot stavební spořitelna', bic: 'WSTV CZ PP' },
    '7980': { name: 'Wüstenrot hypoteční banka', bic: 'WSHY CZ PP' },
    '7990': { name: 'Modrá pyramida', bic: 'MPSS CZ PP' },
    '8030': { name: 'Raiffeisen stavební spořitelna', bic: 'RASS CZ PP' },
    '8040': { name: 'ČM stavební spořitelna', bic: 'CMSP CZ PP' },
    '8060': { name: 'Stavební spořitelna ČS', bic: 'SSCS CZ PP' },
    '8150': { name: 'HSBC Bank', bic: 'HSBC CZ PP' },
    '8200': { name: 'Privatbanka', bic: 'PRIB CZ PP' },
    '8220': { name: 'Všeobecná úverová banka', bic: 'VUBB CZ PP' },
    '8230': { name: 'Max Banka', bic: 'EXPO CZ PP' },
}

/**
 * Calculates IBAN for Czech account
 * @param {string} accountNumber 
 * @param {string} bankCode 
 * @param {string} prefix 
 * @returns {string} IBAN
 */
export const calculateIban = (accountNumber, bankCode, prefix = '') => {
    if (!accountNumber || !bankCode) return ''

    const cleanAccount = accountNumber.padStart(10, '0')
    const cleanPrefix = (prefix || '').padStart(6, '0')
    const fullAccount = cleanPrefix + cleanAccount

    // Country code: CZ -> 1235 (C=12, Z=35)
    // 00 at the end for check digits
    const b = bankCode + fullAccount + '1235' + '00'

    // Modulo 97... large numbers handling
    const mod97 = (string) => {
        let checksum = string.slice(0, 2)
        for (let offset = 2; offset < string.length; offset += 7) {
            const chunk = checksum + string.slice(offset, offset + 7)
            checksum = parseInt(chunk, 10) % 97
        }
        return checksum
    }

    const checkDigits = (98 - mod97(b)).toString().padStart(2, '0')
    return `CZ${checkDigits}${bankCode}${fullAccount}`
}

/**
 * Parses IBAN into account number, prefix and bank code
 */
export const parseIban = (iban) => {
    const clean = iban.replace(/\s/g, '')
    if (clean.length !== 24 || !clean.startsWith('CZ')) return null

    const bankCode = clean.slice(4, 8)
    const prefix = clean.slice(8, 14).replace(/^0+/, '')
    const accountNumber = clean.slice(14, 24).replace(/^0+/, '')

    return { bankCode, prefix, accountNumber }
}
/**
 * Generates Czech QR (Short Payment Descriptor - SPD) payload string
 */
export const getCzechQrPayload = (invoice) => {
    if (!invoice) return ''
    const iban = (invoice.payment.iban || '').replace(/\s/g, '')
    const amount = invoice.amount ? invoice.amount.toFixed(2) : ''
    const currency = invoice.currency || 'CZK'
    // Limited message length for SPD
    const note = (invoice.payment.note || invoice.invoiceNumber || '').substring(0, 60)

    // Extract numbers for Variable Symbol from invoice number (max 10 digits)
    const vs = invoice.invoiceNumber.replace(/\D/g, '').substring(0, 10)

    let payload = `SPD*1.0*ACC:${iban}`
    if (amount) payload += `*AM:${amount}`
    if (currency) payload += `*CC:${currency}`
    if (vs) payload += `*VS:${vs}`
    if (note) payload += `*MSG:${note}`

    return payload
}
