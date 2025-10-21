import { useState, useCallback, useEffect } from "react";
import { logger } from "~/utils/logger";

interface UseCurrencyReturn {
  storeCurrency: string;
  currencySymbol: string;
  loadStoreCurrency: () => Promise<void>;
  isLoading: boolean;
}

// Comprehensive currency symbol map supporting all major Shopify currencies
const CURRENCY_SYMBOLS: { [key: string]: string } = {
  // Americas
  'USD': '$',        // US Dollar
  'CAD': 'C$',       // Canadian Dollar
  'MXN': '$',        // Mexican Peso
  'BRL': 'R$',       // Brazilian Real
  'ARS': '$',        // Argentine Peso
  'CLP': '$',        // Chilean Peso
  'COP': '$',        // Colombian Peso
  'PEN': 'S/',       // Peruvian Sol
  
  // Europe
  'EUR': '€',        // Euro
  'GBP': '£',        // British Pound
  'CHF': 'CHF ',     // Swiss Franc
  'SEK': 'kr',       // Swedish Krona
  'NOK': 'kr',       // Norwegian Krone
  'DKK': 'kr',       // Danish Krone
  'ISK': 'kr',       // Icelandic Króna
  'PLN': 'zł',       // Polish Złoty
  'CZK': 'Kč',       // Czech Koruna
  'HUF': 'Ft',       // Hungarian Forint
  'RON': 'lei',      // Romanian Leu
  'BGN': 'лв',       // Bulgarian Lev
  'HRK': 'kn',       // Croatian Kuna
  'RUB': '₽',        // Russian Ruble
  'UAH': '₴',        // Ukrainian Hryvnia
  'TRY': '₺',        // Turkish Lira
  'TL': '₺',         // Turkish Lira (alternative)
  
  // Asia-Pacific
  'JPY': '¥',        // Japanese Yen
  'CNY': '¥',        // Chinese Yuan
  'KRW': '₩',        // South Korean Won
  'INR': '₹',        // Indian Rupee
  'IDR': 'Rp',       // Indonesian Rupiah
  'MYR': 'RM',       // Malaysian Ringgit
  'PHP': '₱',        // Philippine Peso
  'SGD': 'S$',       // Singapore Dollar
  'THB': '฿',        // Thai Baht
  'VND': '₫',        // Vietnamese Dong
  'HKD': 'HK$',      // Hong Kong Dollar
  'TWD': 'NT$',      // Taiwan Dollar
  'AUD': 'A$',       // Australian Dollar
  'NZD': 'NZ$',      // New Zealand Dollar
  'PKR': '₨',        // Pakistani Rupee
  'BDT': '৳',        // Bangladeshi Taka
  'LKR': 'Rs',       // Sri Lankan Rupee
  'NPR': 'Rs',       // Nepalese Rupee
  
  // Middle East & Africa
  'AED': 'د.إ',      // UAE Dirham
  'SAR': '﷼',        // Saudi Riyal
  'QAR': '﷼',        // Qatari Riyal
  'KWD': 'د.ك',      // Kuwaiti Dinar
  'BHD': 'د.ب',      // Bahraini Dinar
  'OMR': '﷼',        // Omani Rial
  'JOD': 'د.ا',      // Jordanian Dinar
  'ILS': '₪',        // Israeli Shekel
  'EGP': '£',        // Egyptian Pound
  'ZAR': 'R',        // South African Rand
  'NGN': '₦',        // Nigerian Naira
  'KES': 'KSh',      // Kenyan Shilling
  'GHS': '₵',        // Ghanaian Cedi
  'MAD': 'د.م.',     // Moroccan Dirham
  'TND': 'د.ت',      // Tunisian Dinar
  
  // Other
  'NIO': 'C$',       // Nicaraguan Córdoba
  'CRC': '₡',        // Costa Rican Colón
  'BOB': 'Bs.',      // Bolivian Boliviano
  'PYG': '₲',        // Paraguayan Guaraní
  'UYU': '$U',       // Uruguayan Peso
  'VES': 'Bs.S',     // Venezuelan Bolívar
  'DOP': 'RD$',      // Dominican Peso
  'GTQ': 'Q',        // Guatemalan Quetzal
  'HNL': 'L',        // Honduran Lempira
  'PAB': 'B/.',      // Panamanian Balboa
};

/**
 * Custom hook for managing store currency information
 * 
 * Fetches the store's currency code from Shopify and provides
 * the appropriate currency symbol for display.
 * 
 * @returns Currency state and loading function
 */
export function useCurrency(): UseCurrencyReturn {
  const [storeCurrency, setStoreCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [isLoading, setIsLoading] = useState(false);

  const loadStoreCurrency = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('action', 'get-shop-info');
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok && result.shop) {
        const currencyCode = result.shop.currencyCode || 'USD';
        
        setStoreCurrency(currencyCode);
        setCurrencySymbol(CURRENCY_SYMBOLS[currencyCode] || currencyCode + ' ');
        
        logger.debug(`💰 useCurrency: Store currency loaded: ${currencyCode} (${CURRENCY_SYMBOLS[currencyCode] || currencyCode})`);
      } else {
        throw new Error(result.error || 'Failed to fetch shop info');
      }
    } catch (error) {
      logger.error('useCurrency: Failed to load store currency:', error);
      // Fallback to USD
      setStoreCurrency('USD');
      setCurrencySymbol('$');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load currency on mount
  useEffect(() => {
    loadStoreCurrency();
  }, [loadStoreCurrency]);

  return {
    storeCurrency,
    currencySymbol,
    loadStoreCurrency,
    isLoading,
  };
}
