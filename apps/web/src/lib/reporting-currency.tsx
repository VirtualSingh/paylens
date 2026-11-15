import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'paylens.reportingCurrency';
const DEFAULT_CURRENCY = 'USD';

interface ReportingCurrency {
  readonly currency: string;
  readonly setCurrency: (currency: string) => void;
}

const ReportingCurrencyContext = createContext<ReportingCurrency>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => undefined,
});

/**
 * The currency converted figures are shown in, app-wide (ui.md → Currency). Local amounts
 * never change; only the "≈" figures do. Remembered in this browser.
 */
export function ReportingCurrencyProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [currency, setCurrencyState] = useState(readSaved);

  const setCurrency = useCallback((next: string) => {
    setCurrencyState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage may be refused (private window); the choice then lasts until reload.
    }
  }, []);

  const value = useMemo(
    () => ({ currency, setCurrency }),
    [currency, setCurrency],
  );
  return (
    <ReportingCurrencyContext.Provider value={value}>
      {children}
    </ReportingCurrencyContext.Provider>
  );
}

export function useReportingCurrency(): ReportingCurrency {
  return useContext(ReportingCurrencyContext);
}

function readSaved(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}
