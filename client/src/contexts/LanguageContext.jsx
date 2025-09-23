import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  // Always use Chinese as the default language
  const [language] = useState('cn');

  // Remove toggleLanguage function as it's no longer needed

  const getLocalizedText = (englishText, chineseText) => {
    if (language === 'cn' && chineseText) {
      return chineseText;
    }
    return englishText || chineseText; // Fallback to Chinese if English is missing
  };

  return (
    <LanguageContext.Provider value={{
      language,
      getLocalizedText
    }}>
      {children}
    </LanguageContext.Provider>
  );
};