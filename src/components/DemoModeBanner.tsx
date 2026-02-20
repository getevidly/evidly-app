import { Info } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export function DemoModeBanner() {
  const { t } = useTranslation();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-semibold text-blue-900">{t('demo.demoMode')}</h3>
        <p className="text-sm text-blue-700 mt-1">
          {t('demo.viewingSampleData')}
        </p>
      </div>
    </div>
  );
}
