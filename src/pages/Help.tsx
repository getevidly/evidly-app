import { HelpCenter } from '../components/HelpCenter';
import { VisualWorkflow } from '../components/VisualWorkflow';

export function Help() {
  return (
    <div className="space-y-8">
      <VisualWorkflow />
      <HelpCenter inline={true} />
    </div>
  );
}
