import { Shield, ShieldCheck, ShieldX, AlertTriangle, Award } from 'lucide-react';
import type { JurisdictionScoreResult } from '../lib/jurisdictionScoring';

interface JurisdictionScoreDisplayProps {
  result: JurisdictionScoreResult;
}

export function JurisdictionScoreDisplay({ result }: JurisdictionScoreDisplayProps) {
  if (result.systemType === 'none') {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl border border-gray-200 min-h-[200px]">
        <Shield className="w-10 h-10 text-gray-400 mb-3" />
        <div className="text-sm font-medium text-gray-500">Non-CA Location</div>
        <div className="text-xs text-gray-400 mt-1 text-center max-w-[180px]">
          {result.message}
        </div>
      </div>
    );
  }

  // Letter Grade Display (LA, San Diego, Riverside, San Bernardino, Alameda)
  if (result.systemType === 'letter_grade') {
    return (
      <div className="flex flex-col items-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          {result.countyName}
        </div>
        <div
          className="relative w-[120px] h-[120px] rounded-2xl flex items-center justify-center shadow-sm"
          style={{ backgroundColor: result.grade.color }}
        >
          <span className="text-6xl font-black text-white">{result.grade.label}</span>
          {result.grade.special && (
            <div className="absolute -top-2 -right-2">
              <Award className="w-7 h-7 text-yellow-400 drop-shadow" />
            </div>
          )}
        </div>
        <div className="mt-3 text-center">
          <div className="text-lg font-bold text-gray-700">Score: {result.numericScore}</div>
          {result.grade.special && (
            <div className="text-xs font-semibold text-yellow-600 mt-1">{result.grade.special}</div>
          )}
          {!result.grade.passing && (
            <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Below passing</span>
            </div>
          )}
        </div>
        {result.violations.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            {result.violations.length} violation{result.violations.length !== 1 ? 's' : ''} ({result.totalDeductions} pts deducted)
          </div>
        )}
      </div>
    );
  }

  // Color Placard Display (Kern, Sacramento)
  if (result.systemType === 'color_placard') {
    return (
      <div className="flex flex-col items-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          {result.countyName}
        </div>
        <div
          className="w-[120px] h-[120px] rounded-2xl flex flex-col items-center justify-center shadow-sm"
          style={{ backgroundColor: result.grade.color }}
        >
          <span className="text-xl font-black text-white uppercase">{result.grade.label}</span>
          <span className="text-sm font-medium text-white/80 mt-1">Placard</span>
        </div>
        <div className="mt-3 text-center">
          <div className="text-lg font-bold text-gray-700">Score: {result.numericScore}</div>
          {!result.grade.passing && (
            <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Below passing</span>
            </div>
          )}
        </div>
        {result.violations.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            {result.violations.length} violation{result.violations.length !== 1 ? 's' : ''} ({result.totalDeductions} pts deducted)
          </div>
        )}
      </div>
    );
  }

  // Pass/Fail Display (Orange County)
  if (result.systemType === 'pass_fail') {
    const isPassing = result.grade.passing;
    return (
      <div className="flex flex-col items-center">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          {result.countyName}
        </div>
        <div
          className="w-[120px] h-[120px] rounded-2xl flex flex-col items-center justify-center shadow-sm"
          style={{ backgroundColor: isPassing ? '#22c55e' : '#ef4444' }}
        >
          {isPassing ? (
            <ShieldCheck className="w-12 h-12 text-white" />
          ) : (
            <ShieldX className="w-12 h-12 text-white" />
          )}
          <span className="text-lg font-black text-white mt-1">{result.grade.label}</span>
        </div>
        <div className="mt-3 text-center">
          {!isPassing && (
            <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Critical violation found</span>
            </div>
          )}
        </div>
        {result.violations.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            {result.violations.length} violation{result.violations.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    );
  }

  // Standard / Generic CalCode Display
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        {result.countyName}
      </div>
      <div
        className="w-[120px] h-[120px] rounded-2xl flex flex-col items-center justify-center shadow-sm"
        style={{ backgroundColor: result.grade.color }}
      >
        <ShieldCheck className="w-8 h-8 text-white mb-1" />
        <span className="text-sm font-bold text-white text-center px-2 leading-tight">{result.grade.label}</span>
      </div>
      <div className="mt-3 text-center">
        {!result.grade.passing && (
          <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Below passing</span>
          </div>
        )}
      </div>
      {result.violations.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          {result.violations.length} violation{result.violations.length !== 1 ? 's' : ''} ({result.totalDeductions} pts deducted)
        </div>
      )}
    </div>
  );
}
