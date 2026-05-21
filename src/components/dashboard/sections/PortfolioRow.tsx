/**
 * PortfolioRow — C14
 *
 * Single row in the executive portfolio snapshot table.
 */

import type { PortfolioRow as PortfolioRowType } from '../../../hooks/usePortfolioSnapshot';

interface PortfolioRowProps {
  row: PortfolioRowType;
}

const STATUS_LABEL: Record<string, string> = {
  ready: 'READY',
  watch: 'WATCH',
  alarm: 'ALARM',
};

export function PortfolioRow({ row }: PortfolioRowProps) {
  return (
    <div className="port-row">
      <div className="port-loc">{row.location_name}</div>
      <div className="port-cell">{row.logs_done}/{row.logs_total}</div>
      <div className="port-cell">{row.open_actions}</div>
      <div className="port-cell">{row.docs_current}/{row.docs_total}</div>
      <div>
        <span className={`port-status ${row.status}`}>{STATUS_LABEL[row.status]}</span>
      </div>
    </div>
  );
}
